<h4 align="right"><strong>English</strong> | <a href="https://github.com/Penggeor/nestjs-template/blob/main/README_CN.md">简体中文</a>

![NestJS Template](./res/cover.jpg)

# NestJS Template

## Tech Stack
- [Nest.js](https://nestjs.com/): A framework for building efficient, scalable Node.js applications.
- [TypeORM](https://typeorm.io/): An ORM tool for database connection and operations.
- [PostgreSQL](https://www.postgresql.org/): An open-source relational database management system.
- [Redis](https://redis.io/): An open-source in-memory data structure store, used as a database, cache, and message broker.
- [Swagger](https://swagger.io/): A tool for generating API documentation.
> Swagger UI is accessible at `http://localhost:3000/api`. If you're using APIFox or Postman, you can import the API documentation from `http://localhost:3000/api-json`

## Running the Project

### Start Database and Redis

```bash
docker compose up -f ./docker-compose.yml -d
```

> To stop the docker containers, run `docker compose -f ./docker-compose.yml down`

### Install Dependencies

```bash
npm install
```

### Start the Project

```bash
npm run start:dev
```

### Access the Project

1. Via Terminal

```bash
curl --location --request GET 'http://localhost:3000'
```

2. Via Browser

```bash
http://localhost:3000
```

Both methods will return `Hello World!`

## Contact the Author

If you encounter any issues, besides GitHub Issues, you can find my contact information at [wukaipeng.com](https://wukaipeng.com/). 