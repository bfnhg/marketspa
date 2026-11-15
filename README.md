# Marketspa

## Development

You need Bun and Node.js installed.

```sh
git clone https://github.com/bfnhg/marketspa.git
cd marketspa
bun install
bun run dev
```

## Lancer avec Docker

Depuis le dossier du projet, avec Docker et Docker Compose installés :

```sh
docker compose up --build -d
```

Le site sera disponible sur [http://localhost:3000](http://localhost:3000). Pour l'arrêter :

```sh
docker compose down
```

L'image est construite en deux étapes : Bun installe les dépendances et compile le site, puis
seul le serveur de production Nitro est copié dans une image Node plus légère. Le preset
`node-server` permet au rendu côté serveur de fonctionner dans Docker.
