"""Project-local CA profile. Preserve explicit private roots; remove revoked SPKIs.

No network access, private keys, credentials, or system trust-store writes.
"""
from __future__ import annotations
import base64, hashlib, json, os, pathlib, re, shlex, ssl, stat, sys

CERTIFICATES = re.compile(br'-----BEGIN CERTIFICATE-----\s*(.*?)\s*-----END CERTIFICATE-----', re.S)
VARIABLES = ('SSL_CERT_FILE', 'SSL_CERT_DIR', 'REQUESTS_CA_BUNDLE', 'CURL_CA_BUNDLE', 'GRPC_DEFAULT_SSL_ROOTS_FILE_PATH', 'AWS_CA_BUNDLE')
PROVENANCE = 'GCP_PROJECT_CA_PROVENANCE'

def _tlv(data, offset):
    start = offset
    if offset + 2 > len(data): raise ValueError('Truncated certificate DER')
    tag, length = data[offset], data[offset + 1]; offset += 2
    if length & 128:
        count = length & 127
        if not 1 <= count <= 4 or offset + count > len(data): raise ValueError('Invalid certificate DER length')
        length = int.from_bytes(data[offset:offset + count], 'big'); offset += count
    end = offset + length
    if end > len(data): raise ValueError('Truncated certificate DER value')
    return tag, start, offset, end

def spki_sha256(der):
    tag, _, start, end = _tlv(der, 0)
    if tag != 48 or end != len(der): raise ValueError('Invalid certificate sequence')
    tag, _, start, end = _tlv(der, start)
    if tag != 48: raise ValueError('Invalid TBSCertificate sequence')
    children = []
    while start < end:
        child = _tlv(der, start); children.append(child); start = child[3]
    if children[0][0] == 160: children = children[1:]
    if len(children) < 6 or children[5][0] != 48: raise ValueError('Missing subjectPublicKeyInfo')
    _, begin, _, finish = children[5]
    return hashlib.sha256(der[begin:finish]).hexdigest()

def _certificates(path, required=True):
    raw = path.read_bytes()
    blocks = CERTIFICATES.findall(raw)
    if blocks:
        # Extract only public certificate blocks, never copy private-key blocks.
        return [base64.b64decode(re.sub(br'\s+', b'', block), validate=True) for block in blocks]
    if raw.startswith(b'\x30'):
        spki_sha256(raw)
        return [raw]
    if required: raise ValueError('Explicit CA file contains no supported public certificates')
    return []

def _directory_certificates(value):
    values = []
    for name in value.split(os.pathsep):
        if not name: continue
        directory = pathlib.Path(name).expanduser()
        if not directory.is_dir(): raise ValueError('Explicit CA directory is unavailable')
        entries = sorted(directory.iterdir())
        if len(entries) > 4096: raise ValueError('Explicit CA directory is too large')
        seen = set()
        for path in entries:
            if not path.is_file() or path.suffix.lower() in {'.key', '.p12', '.pfx', '.jks', '.json', '.db'}: continue
            resolved = path.resolve()
            if resolved in seen: continue
            seen.add(resolved)
            if path.stat().st_size > 8 * 1024 * 1024: raise ValueError('CA file is too large')
            values.extend(_certificates(path, required=False))
    return values

def configure_environment(project_root=None):
    root = pathlib.Path(project_root).resolve() if project_root else pathlib.Path(__file__).resolve().parents[1]
    public = root / 'security/ca'
    denied = set(json.loads((public / 'blocked-spki.json').read_text())['sha256_spki'])
    base = _certificates(public / 'ca-certificates.crt')
    def owned_directory(path):
        try: info = path.lstat()
        except FileNotFoundError:
            path.mkdir(mode=0o700, exist_ok=True); info = path.lstat()
        if not stat.S_ISDIR(info.st_mode) or info.st_uid != os.getuid() or path.resolve() != path:
            raise ValueError('Project CA output directory is not a canonical owned directory')
        if not path.is_relative_to(root): raise ValueError('Project CA output directory leaves the project')
        if info.st_mode & 0o777 != 0o700: path.chmod(0o700)
    cache = root / '.security-ca-cache'; owned_directory(cache)
    empty = cache / 'empty'; owned_directory(empty)
    if any(empty.iterdir()): raise ValueError('Project CA directory must remain empty')
    sources = {name: os.environ.get(name) for name in VARIABLES}
    # Remember only CA source paths, never credentials or certificate/key bytes.
    # Reusing our generated profile can then survive cache removal without losing
    # an explicitly configured enterprise root or silently reverting to defaults.
    if os.environ.get(PROVENANCE):
        previous = json.loads(os.environ[PROVENANCE])
        if previous.get('version') != 1: raise ValueError('Unsupported project CA source metadata')
        for name in VARIABLES:
            old_source = previous.get('sources', {}).get(name); effective = previous.get('effective', {}).get(name)
            if old_source is not None and not isinstance(old_source, str): raise ValueError('Invalid CA source metadata')
            if sources[name] == effective: sources[name] = old_source
    def read_explicit(name):
        value = sources[name]
        if not value: return []
        path = pathlib.Path(value).expanduser()
        return _directory_certificates(value) if path.is_dir() else _certificates(path)
    common = base + read_explicit('SSL_CERT_FILE')
    if sources['SSL_CERT_DIR']: common += _directory_certificates(sources['SSL_CERT_DIR'])
    def bundle(certs):
        retained = {}
        for der in certs:
            if spki_sha256(der) not in denied: retained[hashlib.sha256(der).hexdigest()] = der
        if not retained: raise ValueError('No trusted project certificates remain')
        raw = ''.join(ssl.DER_cert_to_PEM_cert(retained[key]) for key in sorted(retained)).encode()
        digest = hashlib.sha256(raw).hexdigest(); target = cache / (digest + '.pem')
        try: info = target.lstat()
        except FileNotFoundError: info = None
        if info is not None and (not stat.S_ISREG(info.st_mode) or info.st_uid != os.getuid() or info.st_nlink != 1):
            raise ValueError('Project CA output file must be an owned regular file without aliases')
        if target.parent.resolve() != cache or (info is not None and target.resolve() != target):
            raise ValueError('Project CA output file leaves the cache')
        if info is None:
            temp = cache / (digest + '.' + str(os.getpid()) + '.tmp')
            with temp.open('xb') as handle: handle.write(raw)
            temp.chmod(0o600); os.replace(temp, target)
        if target.read_bytes() != raw: raise ValueError('Project CA cache content mismatch')
        if target.stat().st_mode & 0o777 != 0o600: target.chmod(0o600)
        context = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT); context.load_verify_locations(cafile=str(target))
        return str(target)
    profile = {'SSL_CERT_FILE': bundle(common), 'SSL_CERT_DIR': str(empty)}
    for name in ('REQUESTS_CA_BUNDLE', 'CURL_CA_BUNDLE', 'GRPC_DEFAULT_SSL_ROOTS_FILE_PATH'):
        profile[name] = bundle(common + read_explicit(name))
    # Botocore inherits REQUESTS_CA_BUNDLE unless AWS_CA_BUNDLE is explicit.
    profile['AWS_CA_BUNDLE'] = bundle(common + read_explicit('AWS_CA_BUNDLE')) if sources['AWS_CA_BUNDLE'] else profile['REQUESTS_CA_BUNDLE']
    profile[PROVENANCE] = json.dumps({'version': 1, 'sources': sources, 'effective': dict(profile)}, separators=(',', ':'))
    os.environ.update(profile)
    return profile

if __name__ == '__main__':
    try: profile = configure_environment()
    except Exception as exc:
        raise SystemExit('Project CA profile could not be prepared (' + type(exc).__name__ + '); check explicit CA paths.') from None
    if sys.argv[1:2] == ['--shell']:
        print('\n'.join('export ' + name + '=' + shlex.quote(profile[name]) for name in VARIABLES + (PROVENANCE,)))
    elif sys.argv[1:2] == ['--exec'] and len(sys.argv) > 2:
        os.execvpe(sys.argv[2], sys.argv[2:], os.environ)
    else:
        raise SystemExit('Usage: security_ca.py --shell | --exec COMMAND [ARG ...]')
