# Server Storage Setup (SQLite)

This project now supports server-side state persistence through `/api/state`.

## 1) Install dependencies

```bash
npm install
```

## 2) Start API locally

```bash
npm start
```

Default API port is `8787`, DB file is `./data/app.db`.

## 3) Nginx reverse proxy example

Add to your site `server {}`:

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:8787/api/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

Then reload nginx:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

## 4) Verify in UI

In parent view -> System settings:

- click `登录/注册` and create your account first
- click `检查同步状态`
- click `保存到服务器`

After that, updates are auto-saved to server (debounced).
