# PromptVault

A full-stack web app for storing, organizing, and sharing AI prompts. Browse prompts publicly or sign in to create and manage your own.

**Live demo:** https://promptoverflow-black.vercel.app

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Angular 21, TypeScript |
| Backend | Django 4.2, Django REST Framework |
| Auth | JWT (SimpleJWT) |
| Frontend hosting | Vercel |
| Backend hosting | Railway |
| Database | PostgreSQL (prod) / SQLite (local) |

## Project Structure

```
PromptVault/
├── promptVaultFront/   # Angular frontend
└── promptvault/        # Django REST API backend
```

## Getting Started

### Backend

```bash
cd promptvault
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

API runs at `http://localhost:8000`

### Frontend

```bash
cd promptVaultFront
npm install
ng serve
```

App runs at `http://localhost:4200`

## API

- Authentication: JWT — obtain tokens at `/api/token/`, refresh at `/api/token/refresh/`
- Default permissions: read-only for anonymous users, full access for authenticated users
- Pagination: 20 items per page

## License

MIT — see [LICENSE](LICENSE)
