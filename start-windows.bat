@echo off
start cmd /k "cd server && npm install && npm run dev"
start cmd /k "cd client && npm install && npm run dev"
