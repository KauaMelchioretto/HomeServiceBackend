const express = require("express");
const app = express();
const postGree = require("pg");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
var path = require('path');

const dataBase = new postGree.Pool({
  connectionString: process.env.CONNECTION_STRING
});

dataBase.connect((err) => {
  if (err) console.log(err);
  else console.log("connected succesfully"), createDataBaseTables();
});

async function createDataBaseTables() {
  let usersTable =
    "CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY NOT NULL UNIQUE, username varchar(60) NOT NULL, email varchar(45) NOT NULL UNIQUE, password varchar(45) NOT NULL, active BOOLEAN NOT NULL);";

  let servicesTable =
    "CREATE TABLE IF NOT EXISTS services (id SERIAL PRIMARY KEY NOT NULL UNIQUE, user_id SERIAL NOT NULL, name varchar(45) NOT NULL, profession varchar(45) NOT NULL, city varchar(45) NOT NULL, cit2 varchar(45) DEFAULT NULL, phone_number varchar(45) NOT NULL, description varchar(100) DEFAULT NULL, CONSTRAINT user_id FOREIGN KEY (user_id) REFERENCES users (id));";

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
};

app.listen(process.env.PORT || 3001, () => {
  console.log(`rodando server na porta ${process.env.PORT}`);
});

app.use(cors({ credentials:true, origin:"https://homeservice-1vyv.onrender.com" }));
app.use(cors());
app.use(express.json());
app.use(cookieParser());

app.get('/*', function (request, response) {
  response.sendFile(path.join(__dirname, "/index.html"), function (err) {
    if (err) {
      response.status(500).send(err);
    }
  });
});

function verifyJWT(request, response) {
  const token = jwt.decode(request);
  const idUser = parseInt(token.result.map((value) => value.iduser));
  if (idUser != undefined) return idUser;
  else return response.status(401).end();
}

app.post("/registrosDeServicos", (request, response) => {
  const { userToken } = request.body;
  const iduser = verifyJWT(userToken);
  const { name } = request.body;
  const { profession } = request.body;
  const { city } = request.body;
  const { city2 } = request.body;
  const { numberTel } = request.body;
  const { description } = request.body;

  let SQL = `INSERT INTO services (iduser, name, profession, city, city2, numberTel, description) VALUES ( ?, ?, ?, ?, ?, ?, ?)`;

  dataBase.query(
    SQL,
    [iduser, name, profession, city, city2, numberTel, description],
    (err, result) => {
      if (err) console.log(err);
      else response.send(result);
    }
  );
});

app.post("/getCards", (request, response) => {
  const { userToken } = request.body;
  const iduser = verifyJWT(userToken);

  let SQL = "SELECT * FROM services WHERE ? = iduser";

  dataBase.query(SQL, [iduser], (err, result) => {
    if (err) console.log(err);
    else response.send(result);
  });
});

app.post("/resultados", (request, response) => {
  const { information } = request.body;
  console.log(information);
  if (information != null && information != " " && information != "") {
    SQL = `SELECT idservice , name, profession, city, city2, numberTel, description FROM services WHERE LOCATE (?, name) > 0 OR LOCATE (?, profession) > 0 OR LOCATE (?, city) > 0 OR LOCATE (?, city2) > 0 `;

    dataBase.query(
      SQL,
      [information, information, information, information],
      (err, result) => {
        if (err) console.log(err);
        else response.send(result);
      }
    );
  } else {
    response.send("");
  }
});

function getUserNameJWT(request, response) {
  const token = jwt.decode(request);
  var username = JSON.stringify(token.result.map((value) => value.username));
  username = username.replace(/[[\]\\"]/g, "");
  if (username != undefined) return username;
  else return response.status(401).end();
}

app.post("/getUserName", (request, response) => {
  const { userToken } = request.body;
  const username = getUserNameJWT(userToken);
  response.send(username);
});

app.post("/registrarAvaliacao", (request, response) => {
  const { idService } = request.body;
  const { userToken } = request.body;
  const username = getUserNameJWT(userToken);
  const { comment } = request.body;
  const { avaliation } = request.body;

  let SQL =
    "INSERT INTO avaliations (idservice, username, comment, avaliation) VALUES (?, ?, ?, ?)";

  dataBase.query(
    SQL,
    [idService, username, comment, avaliation],
    (err, result) => {
      if (err) console.log(err);
      else response.send(result);
    }
  );
});

app.post("/getAvaliations", (request, response) => {
  const { idService } = request.body;

  let SQL =
    "SELECT idavaliation, username, comment, avaliation FROM avaliations WHERE ? = idservice";

  dataBase.query(SQL, [idService], (err, result) => {
    if (err) console.log(err);
    else response.send(result);
  });
});

app.post("/getEmailUsuario", (request, response) => {
  const { email } = request.body;

  let SQL = "SELECT email FROM users WHERE email = ?";
  dataBase.query(SQL, [email], (err, result) => {
    if (err) console.log(err);
    else response.send(result);
  });
});

app.post("/registroUsuario", (request, response) => {
  const { userName } = request.body;
  const { email } = request.body;
  const { password } = request.body;

  let SQL =
    "INSERT INTO users (username, email, password, active) VALUES (?, ?, ?, ?)";
  dataBase.query(SQL, [userName, email, password, false], (err, result) => {
    if (err) console.log(err);
    else response.sendStatus(200);
  });
});

app.post("/login", (request, response) => {
  const { email } = request.body;
  const { password } = request.body;
  let token;

  let SQL =
    "SELECT iduser, username FROM users WHERE ? = email AND ? = password";
  dataBase.query(SQL, [email, password], (err, result) => {
    if (err) console.log(err);
    else {
      if (result.length !== 0) {
        token = jwt.sign({ result }, process.env.SECRET, { expiresIn: "1h" });
        response.cookie("token", token, {
          path: "/",
          expires: new Date(Date.now() + 1200000),
          httpOnly: false,
          secure: true,
          sameSite: "none",
        });
        response.json({ auth: true, token, result });
      } else response.send(null);
    }
  });
});

app.get("/getcookie", function (request, response) {
  response.send(request.cookies);
});

app.get("/clearcookie", function (req, res) {
  res.clearCookie("token", { path: "/", secure: true, sameSite: "none" });
  res.end();
});

app.put("/editService", (request, response) => {
  const { id } = request.body;
  const { name } = request.body;
  const { profession } = request.body;
  const city = request.body.city;
  const city2 = request.body.city2;
  const numberTel = request.body.numberTel;
  const description = request.body.description;

  let SQL =
    "UPDATE services SET name = ?, profession = ?, city = ?, city2 = ?, numberTel = ?, description = ?WHERE idservice = ?";

  dataBase.query(
    SQL,
    [name, profession, city, city2, numberTel, description, id],
    (err, result) => {
      if (err) console.log(err);
      else response.send(result);
    }
  );
});

app.post("/deleteAvaliation", (request, response) => {
  const { id } = request.body;

  let SQL = "DELETE FROM avaliations WHERE idservice = ?";
  dataBase.query(SQL, [id], (err, result) => {
    if (err) console.log(err);
    else response.send(result);
  });
});

app.post("/deleteService", (request, response) => {
  const { id } = request.body;

  let SQL = "DELETE FROM services WHERE idservice = ?";
  dataBase.query(SQL, [id], (err, result) => {
    if (err) console.log(err);
    else response.send(result);
  });
});
