#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Añade subdominios extra (aliased hosts) para un front existente (ej. "es")
y opcionalmente lo marca como 'principal' para servir el dominio raíz.

Cosas que hace:
- Lee .stack_config.json para obtener el dominio base.
- Pregunta:
  - Nombre del front (carpeta dentro de ./frontend, ej: "es")
  - Tipo de front (vue/nuxt) -> para saber a qué puerto proxyear (80 / 3000)
  - Lista de subdominios sin dominio (ej: "modeli,cordoba")
  - Si ese front debe ser el "principal" (dominio puro sin subdominio)
- Actualiza:
  - compose.prod.yml -> añade los nuevos hosts al comando de certbot
  - nginx/conf.d/reverse-proxy.http.conf
  - nginx/conf.d/reverse-proxy.https.conf.disabled

Es idempotente: si un host ya está en los archivos, no lo duplica.
"""

from __future__ import annotations
import json
import re
from pathlib import Path
from typing import List

CONFIG_FILE = ".stack_config.json"


# ───────── helpers de consola ─────────

def ask_bool(msg: str) -> bool:
    return input(f"{msg} (y/n) ").strip().lower().startswith("y")


def ask_choice(msg: str, options: List[str]) -> str:
    opts = "/".join(options)
    while True:
        v = input(f"{msg} [{opts}]: ").strip().lower()
        if v in options:
            return v
        print("  Opción inválida.")


# ───────── helpers de archivos ─────────

def load_cfg(root: Path) -> dict:
    cfg_path = root / CONFIG_FILE
    if not cfg_path.exists():
        raise SystemExit(f"❌ No se encontró {CONFIG_FILE} en {root}")
    return json.loads(cfg_path.read_text(encoding="utf-8"))


def save_file(path: Path, content: str) -> None:
    path.write_text(content, encoding="utf-8")


# ───────── patch a compose.prod.yml (certbot) ─────────

def patch_compose_certbot_hosts(compose_path: Path, extra_hosts: List[str]) -> None:
    """
    Busca la línea del certbot con `for d in ...; do` y añade extra_hosts.
    """
    if not compose_path.exists():
        raise SystemExit(f"❌ No existe {compose_path}")

    text = compose_path.read_text(encoding="utf-8")

    m = re.search(r"(for d in )(.*?)(; do)", text)
    if not m:
        raise SystemExit("❌ No se encontró el fragmento `for d in ...; do` en compose.prod.yml")

    before, host_list, after = m.group(1), m.group(2), m.group(3)

    current_hosts = [h for h in host_list.split() if h.strip()]
    host_set = set(current_hosts)

    for h in extra_hosts:
        host_set.add(h)

    new_hosts_str = " ".join(sorted(host_set))
    new_fragment = before + new_hosts_str + after

    new_text = text[:m.start()] + new_fragment + text[m.end():]
    save_file(compose_path, new_text)
    print("✔ compose.prod.yml actualizado con nuevos hosts para certbot.")


# ───────── patch a nginx http/https ─────────

HTTP_TEMPLATE_REDIRECT = """
server {{
    listen 80;
    server_name {host};

    location ^~ /.well-known/acme-challenge/ {{
        root /var/www/certbot;
    }}

    location / {{
        return 301 https://$host$request_uri;
    }}
}}
"""

HTTP_TEMPLATE_WWW_TO_ROOT = """
server {{
    listen 80;
    server_name www.{root_domain};

    location ^~ /.well-known/acme-challenge/ {{
        root /var/www/certbot;
    }}

    location / {{
        return 301 https://{root_domain}$request_uri;
    }}
}}
"""

HTTPS_TEMPLATE_PROXY = """
server {{
    listen 443 ssl;
    http2 on;
    server_name {host};

    ssl_certificate /etc/letsencrypt/live/{host}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/{host}/privkey.pem;
    include /etc/nginx/conf.d/ssl_params.conf;

    location / {{
        proxy_pass http://{upstream}:{port};
        include /etc/nginx/proxy_params.conf;
    }}
}}
"""

HTTPS_TEMPLATE_WWW_TO_ROOT = """
server {{
    listen 443 ssl;
    http2 on;
    server_name www.{root_domain};

    ssl_certificate /etc/letsencrypt/live/www.{root_domain}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/www.{root_domain}/privkey.pem;
    include /etc/nginx/conf.d/ssl_params.conf;

    location / {{
        return 301 https://{root_domain}$request_uri;
    }}
}}
"""


def ensure_server_block(http_conf_path: Path, https_conf_path: Path,
                        host: str, upstream: str, port: int) -> None:
    """
    Añade bloques server para un host concreto (ej: modeli.midominio.com)
    - HTTP: redirección a HTTPS
    - HTTPS: proxy al upstream:port
    Si ya existen (buscando `server_name host;`), no se añaden de nuevo.
    """
    http_text = http_conf_path.read_text(encoding="utf-8")
    https_text = https_conf_path.read_text(encoding="utf-8")

    # HTTP
    if f"server_name {host};" not in http_text:
        http_text += HTTP_TEMPLATE_REDIRECT.format(host=host)
        save_file(http_conf_path, http_text)
        print(f"✔ Añadido bloque HTTP para {host}")
    else:
        print(f"· Bloque HTTP para {host} ya existe, se deja igual.")

    # HTTPS
    if f"server_name {host};" not in https_text:
        https_text += HTTPS_TEMPLATE_PROXY.format(
            host=host,
            upstream=upstream,
            port=port,
        )
        save_file(https_conf_path, https_text)
        print(f"✔ Añadido bloque HTTPS para {host} -> {upstream}:{port}")
    else:
        print(f"· Bloque HTTPS para {host} ya existe, se deja igual.")


def ensure_root_domain_blocks(http_conf_path: Path, https_conf_path: Path,
                              root_domain: str, upstream: str, port: int) -> None:
    """
    Crea:
      - dominio.com (HTTP -> HTTPS, HTTPS -> proxy)
      - www.dominio.com (HTTP/HTTPS -> 301 a dominio.com)
    Si ya existen bloques con esos server_name, no se duplican.
    """
    http_text = http_conf_path.read_text(encoding="utf-8")
    https_text = https_conf_path.read_text(encoding="utf-8")

    # dominio.com HTTP
    if f"server_name {root_domain};" not in http_text:
        http_text += HTTP_TEMPLATE_REDIRECT.format(host=root_domain)
        save_file(http_conf_path, http_text)
        print(f"✔ Añadido bloque HTTP para dominio raíz {root_domain}")
    else:
        print(f"· Bloque HTTP para {root_domain} ya existe.")

    # www.dominio.com HTTP -> redirect a dominio.com
    if f"server_name www.{root_domain};" not in http_text:
        http_text += HTTP_TEMPLATE_WWW_TO_ROOT.format(root_domain=root_domain)
        save_file(http_conf_path, http_text)
        print(f"✔ Añadido bloque HTTP para www.{root_domain} -> {root_domain}")
    else:
        print(f"· Bloque HTTP para www.{root_domain} ya existe.")

    # dominio.com HTTPS -> proxy
    if f"server_name {root_domain};" not in https_text:
        https_text += HTTPS_TEMPLATE_PROXY.format(
            host=root_domain,
            upstream=upstream,
            port=port,
        )
        save_file(https_conf_path, https_text)
        print(f"✔ Añadido bloque HTTPS para dominio raíz {root_domain} -> {upstream}:{port}")
    else:
        print(f"· Bloque HTTPS para {root_domain} ya existe.")

    # www.dominio.com HTTPS -> redirect a dominio.com
    if f"server_name www.{root_domain};" not in https_text:
        https_text += HTTPS_TEMPLATE_WWW_TO_ROOT.format(root_domain=root_domain)
        save_file(https_conf_path, https_text)
        print(f"✔ Añadido bloque HTTPS para www.{root_domain} -> {root_domain}")
    else:
        print(f"· Bloque HTTPS para www.{root_domain} ya existe.")


# ───────── main ─────────

def main() -> None:
    project_dir = input("Ruta de la carpeta del proyecto (donde está compose.prod.yml): ").strip()
    root = Path(project_dir).resolve()

    cfg = load_cfg(root)
    domain = cfg["domain"]  # p.ej. "midominio.com"

    front_name = input("Nombre del front (carpeta dentro de ./frontend, ej. 'es'): ").strip()
    front_type = ask_choice("Tipo de front", ["vue", "nuxt"])

    # upstream = nombre del servicio en docker-compose (front_<name>)
    upstream = f"front_{front_name}"
    port = 80 if front_type == "vue" else 3000

    raw_subs = input("Subdominios SIN dominio, separados por coma (ej: 'modeli,cordoba'), vacío si no: ").strip()
    sub_names = [s.strip() for s in raw_subs.split(",") if s.strip()]
    sub_hosts = [f"{sub}.{domain}" for sub in sub_names]

    is_primary = ask_bool(
        f"¿Quieres que este front '{front_name}' sea el PRINCIPAL (servir {domain} y www.{domain})?"
    )

    # 1) Compose: añadir hosts a certbot
    compose_path = root / "compose.prod.yml"
    hosts_for_cert = list(sub_hosts)
    if is_primary:
        hosts_for_cert.extend([domain, f"www.{domain}"])

    if hosts_for_cert:
        patch_compose_certbot_hosts(compose_path, hosts_for_cert)
    else:
        print("No se añadieron nuevos hosts a certbot (lista vacía).")

    # 2) Nginx: añadir server blocks
    http_conf_path = root / "nginx" / "conf.d" / "reverse-proxy.http.conf"
    https_conf_path = root / "nginx" / "conf.d" / "reverse-proxy.https.conf.disabled"

    if not http_conf_path.exists() or not https_conf_path.exists():
        raise SystemExit("❌ No se encontraron los archivos de Nginx reverse-proxy.*.conf")

    # Subdominios tipo modeli.midominio.com, cordoba.midominio.com, etc.
    for host in sub_hosts:
        ensure_server_block(http_conf_path, https_conf_path, host, upstream, port)

    # Dominio raíz, si este front es el principal
    if is_primary:
        ensure_root_domain_blocks(http_conf_path, https_conf_path, domain, upstream, port)

    print("\n✅ Listo.")
    if hosts_for_cert:
        print("Recuerda volver a subir producción para que certbot y el proxy cojan los cambios:")
        print("  docker compose -f compose.prod.yml up -d proxy certbot")
        print("o simplemente:")
        print("  docker compose -f compose.prod.yml up -d")


if __name__ == "__main__":
    main()
