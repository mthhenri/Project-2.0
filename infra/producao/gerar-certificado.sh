#!/bin/sh
# Cria, uma única vez, uma autoridade local e o certificado de cek.project (task 499). A chave da autoridade é apagada logo
# depois de assinar: quem confiar no ca.crt não fica exposto a certificados novos emitidos por ela.
set -e
cd /certificados
[ -f servidor.crt ] && exit 0
command -v openssl >/dev/null || apk add --no-cache openssl

openssl req -x509 -newkey rsa:2048 -nodes -days 825 -keyout ca.key -out ca.crt -subj "/CN=Project 2.0 - autoridade local" \
    -addext "basicConstraints=critical,CA:TRUE,pathlen:0" -addext "keyUsage=critical,keyCertSign" \
    -addext "nameConstraints=critical,permitted;DNS:cek.project,permitted;DNS:localhost"

printf 'subjectAltName=DNS:cek.project,DNS:localhost\nbasicConstraints=CA:FALSE\nextendedKeyUsage=serverAuth\n' > servidor.ext
openssl req -newkey rsa:2048 -nodes -keyout servidor.key -out servidor.csr -subj "/CN=cek.project"
openssl x509 -req -in servidor.csr -CA ca.crt -CAkey ca.key -CAcreateserial -days 825 -extfile servidor.ext -out servidor.crt

rm -f ca.key ca.srl servidor.csr servidor.ext
chmod 644 servidor.key
