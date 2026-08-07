# Real-Time Inventory & Order Sync System

A real-time inventory management platform that keeps stock levels synced across multiple outlets, preventing overselling during concurrent orders. Built with the MERN stack, Socket.io for live updates, and deployed on AWS.

![Node](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![MongoDB](https://img.shields.io/badge/MongoDB-Transactions-47A248?logo=mongodb&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-Realtime-010101?logo=socket.io&logoColor=white)
![AWS](https://img.shields.io/badge/AWS-EC2%20%7C%20S3%20%7C%20SES-FF9900?logo=amazonaws&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-blue)

## Overview

Retail chains with multiple outlets sharing the same product catalog face a common problem: when two locations sell the same SKU at the same time, naive stock updates can push inventory below zero. This project solves that with atomic, transaction-safe stock operations broadcast in real time to every connected client.

## Features

- **Live stock sync** — every outlet sees inventory changes instantly via Socket.io, scoped by outlet "rooms" plus a global feed for cross-location dashboards.
- **Race-condition-safe updates** — stock adjustments use Mongoose optimistic concurrency (versioned documents) with an automatic retry loop; order placement uses MongoDB multi-document transactions with an atomic `findOneAndUpdate` stock guard, so orders never oversell.
- **Automated low-stock alerts** — AWS SES sends an email the moment any product drops below its configured threshold.
- **Search & filter at scale** — compound and text indexes on outlet, name, and quantity keep queries fast as the catalog grows.
- **Cloud-deployed** — API runs on EC2, static assets on S3.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite), Socket.io-client, Axios |
| Backend | Node.js, Express.js, Socket.io |
| Database | MongoDB (Mongoose, transactions, optimistic locking) |
| Cloud | AWS EC2, S3, SES |

## Architecture

```
┌─────────────┐        REST + WebSocket        ┌──────────────┐
│   React     │◄───────────────────────────────►│   Express    │
│  Dashboard  │        Socket.io rooms          │   API Layer  │
│ (Outlet A/B)│                                  └──────┬───────┘
└─────────────┘                                         │
                                                          │ transactions +
                                                          │ optimistic locking
                                                   ┌──────▼───────┐
                                                   │   MongoDB    │
                                                   └──────────────┘
                                                          │
                                                   low stock trigger
                                                          │
                                                   ┌──────▼───────┐
                                                   │   AWS SES    │
                                                   └──────────────┘
```

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- AWS account (optional, only needed for SES email alerts)

### Backend

```bash
cd backend
cp .env.example .env   # fill in MONGO_URI, AWS creds, etc.
npm install
npm run dev
```

### Frontend

```bash
cd frontend
cp .env.example .env   # set VITE_API_URL
npm install
npm run dev
```

Visit `http://localhost:5173`. Open two browser windows on different outlets and watch stock update live as orders are placed in either.

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/products?outlet=&search=` | List/search products |
| `POST` | `/api/products` | Create a product |
| `PATCH` | `/api/products/:id/adjust` | Adjust stock (`{ delta }`), optimistic-lock protected |
| `POST` | `/api/orders` | Place an order (`{ outlet, items }`), transaction-protected |
| `GET` | `/api/orders?outlet=` | List recent orders |

## Key Engineering Decisions

- **Why optimistic locking for manual adjustments, but transactions for orders?** Single-field stock tweaks (restocks, corrections) are low-contention and benefit from the lighter-weight retry pattern. Multi-item orders need all-or-nothing atomicity across several products, which transactions guarantee.
- **Why room-based Socket.io broadcasts?** Scoping updates to an outlet room avoids flooding every connected client with irrelevant traffic as the number of outlets grows, while a global room still powers aggregate dashboards.

## License

MIT © Krishna Magar
