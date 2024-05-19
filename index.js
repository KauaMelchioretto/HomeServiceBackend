const express = require("express");
const app = express();
const postGree = require("pg");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require('dotenv').config();

const dataBase = new postGree.Pool({
  user: "postgres",
  password: "password",
  port: 5432,
  database: "homeservice",
  host: "localhost"
  // connectionString: process.env.CONNECTION_STRING
});


app.listen(process.env.PORT || 3001, () => {
  console.log(`rodando server na porta ${process.env.PORT}`);
});

app.use(cors({ credentials:true, origin:/*"http://localhost:3000"*/"https://homeservice-ute7.onrender.com" }));
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

dataBase.connect((err) => {
  if (err) console.log(err);
  else console.log("connected succesfully"), createDataBaseTables();
});

async function createDataBaseTables() {
  let usersTable =
    "CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY NOT NULL UNIQUE, username varchar(60) NOT NULL, email varchar(45) NOT NULL UNIQUE, password varchar(45) NOT NULL, active BOOLEAN NOT NULL);";

  let servicesTable =
    "CREATE TABLE IF NOT EXISTS services (id SERIAL PRIMARY KEY NOT NULL UNIQUE, user_id SERIAL NOT NULL, name varchar(45) NOT NULL, profession varchar(45) NOT NULL, city varchar(45) NOT NULL, city2 varchar(45) DEFAULT NULL, phone_number varchar(45) NOT NULL, description varchar(100) DEFAULT NULL, CONSTRAINT user_id FOREIGN KEY (user_id) REFERENCES users (id));";

  let avaliationsTable =
    "CREATE TABLE IF NOT EXISTS avaliations (id SERIAL PRIMARY KEY NOT NULL UNIQUE, service_id int NOT NULL, username varchar(60) NOT NULL, comment varchar(350) DEFAULT NULL, avaliation int NOT NULL,CONSTRAINT service_id FOREIGN KEY (service_id) REFERENCES services (id))";

  var queries = [];
  queries.push(usersTable, servicesTable, avaliationsTable);

  for (let i = 0; i < queries.length; i++) {
    try {
      let res = await dataBase.query(queries[i]);
      console.log(res);
    } catch (err) {
      console.log(err);
    }
  }
  console.clear();
};


function verifyJWT(request, response) {
  const token = jwt.decode(request);
  const userId = parseInt(token.result.rows.map((value) => value.id));
  if (userId != undefined) return userId;
  else return response.status(401).end();
}

app.post("/registrosDeServicos", (request, response) => {
  const { userToken } = request.body;
  const userId = verifyJWT(userToken);
  const { name } = request.body;
  const { profession } = request.body;
  const { city } = request.body;
  const { city2 } = request.body;
  const { phoneNumber } = request.body;
  const { description } = request.body;

  let SQL = `INSERT INTO services (user_id, name, profession, city, city2, phone_number, description) VALUES ( $1, $2, $3, $4, $5, $6, $7)`;

  dataBase.query(
    SQL,
    [userId, name, profession, city, city2, phoneNumber, description],
    (err, result) => {
      if (err) console.log(err);
      else response.send(result);
    }
  );
});

app.post("/getCards", (request, response) => {
  const { userToken } = request.body;
  const userId = verifyJWT(userToken);

  let SQL = "SELECT * FROM services WHERE $1 = user_id";

  dataBase.query(SQL, [userId], (err, result) => {
    console.log(JSON.stringify(result));
    if (err) console.log(err);
    else response.send(result.rows);
  });
});

app.post("/resultados", (request, response) => {
  const { information } = request.body;
  if (information != null && information != " " && information != "") {
    SQL = `SELECT id , name, profession, city, city2, phone_number, description FROM services WHERE name ~* $1 OR profession ~* $1 OR city ~* $1 OR city2 ~* $1`;

    dataBase.query(
      SQL,
      [information],
      (err, result) => {
        if (err) console.log(err);
        else response.json(result.rows);
      }
    );
  } else {
    response.send("");
  }
});

function _getUserNameJWT(request, response) {
  const token = jwt.decode(request);
  var username = JSON.stringify(token.result.rows.map((value) => value.username));
  username = username.replace(/[[\]\\"]/g, "");
  if (username != undefined) return username;
  else return response.status(401).end();
}

app.post("/getUserName", (request, response) => {
  const { userToken } = request.body;
    const userName = _getUserNameJWT(userToken);
    response.send(userName);
});

app.post("/registrarAvaliacao", (request, response) => {
  const { serviceId } = request.body;
  const { userToken } = request.body;
  const username = _getUserNameJWT(userToken);
  const { comment } = request.body;
  const { avaliation } = request.body;

  let SQL =
    "INSERT INTO avaliations (service_id, username, comment, avaliation) VALUES ($1, $2, $3, $4)";

  dataBase.query(
    SQL,
    [serviceId, username, comment, avaliation],
    (err, result) => {
      if (err) console.log(err);
      else response.send(result);
    }
  );
});

app.post("/getAvaliations", (request, response) => {
  const { serviceId } = request.body;

  let SQL =
    "SELECT id, username, comment, avaliation FROM avaliations WHERE $1 = service_id";

  dataBase.query(SQL, [serviceId], (err, result) => {
    if (err) console.log(err);
    else response.send(result.rows);
  });
});

app.post("/getEmailUsuario", (request, response) => {
  const { email } = request.body;

  let SQL = "SELECT email FROM users WHERE email = $1";
  dataBase.query(SQL, [email], (err, result) => {
    if (err) console.log(err);
    else response.send(result.rows[0]);
  });
});

app.post("/registroUsuario", (request, response) => {
  const { userName } = request.body;
  const { email } = request.body;
  const { password } = request.body;

  let SQL =
    "INSERT INTO users (username, email, password, active) VALUES ($1, $2, $3, $4)";
  dataBase.query(SQL, [userName, email, password, false], (err, result) => {
    if (err) console.log(err);
    else response.sendStatus(200), console.log(result);
  });
});

app.post("/login", (request, response) => {
  const { email } = request.body;
  const { password } = request.body;
  let token;

  let SQL =
    "SELECT id, username FROM users WHERE $1 = email AND $2 = password";
  dataBase.query(SQL, [email, password], (err, result) => {
    if (err) console.log(err);
    else {
      if (result.rows.length !== 0) {
        token = jwt.sign({ result }, process.env.SECRET, { expiresIn: "1h" });
        response.json({ auth: true, token, result });
      } else response.send(null);
    }
  });
});

app.put("/editService", (request, response) => {
  console.log(`request: ${JSON.stringify(request.body)}`)
  const { id } = request.body;
  const { name } = request.body;
  const { profession } = request.body;
  const { city } = request.body;
  const { city2 } = request.body;
  const { phoneNumber } = request.body;
  const { description } = request.body;

  let SQL =
    "UPDATE services SET name = $1, profession = $2, city = $3, city2 = $4, phone_number = $5, description = $6 WHERE id = $7";

  dataBase.query(
    SQL,
    [name, profession, city, city2, phoneNumber, description, id],
    (err, result) => {
      if (err) console.log(err);
      else response.send(result.rows);
    }
  );
});

app.post("/deleteAvaliation", (request, response) => {
  const { id } = request.body;

  let SQL = "DELETE FROM avaliations WHERE service_id = $1";
  dataBase.query(SQL, [id], (err, result) => {
    if (err) console.log(err);
    else response.send(result);
  });
});

app.post("/deleteService", (request, response) => {
  const { id } = request.body;

  let SQL = "DELETE FROM services WHERE id = $1";
  dataBase.query(SQL, [id], (err, result) => {
    if (err) console.log(err);
    else response.send(result);
  });
});