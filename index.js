"use strict";
const  express  =  require('express');
const  bodyParser  =  require('body-parser');
const cors = require('cors')
const  sqlite3  =  require('sqlite3').verbose();
const  jwt  =  require('jsonwebtoken');
const  bcrypt  =  require('bcryptjs');

const SECRET_KEY = "secretkey23456";

const  app  =  express();
const  router  =  express.Router();
app.use(cors())

router.use(bodyParser.urlencoded({ extended:  false }));
router.use(bodyParser.json());
const database = new sqlite3.Database("./roskilde.db");

const  createUsersTable  = () => {
    const  sqlQuery  =  `
        CREATE TABLE IF NOT EXISTS users (
        userId integer NOT NULL PRIMARY KEY AUTOINCREMENT,
        name text,
        email text UNIQUE,
        teamName text UNIQUE,
        password text,
        teamId integer,
        FOREIGN KEY(teamId) REFERENCES teams(teamId))`;

    return  database.run(sqlQuery);
}

const  createTeamsTable  = () => {
    const  sqlQuery  =  `
        CREATE TABLE IF NOT EXISTS teams (
        teamId integer NOT NULL PRIMARY KEY AUTOINCREMENT,
        teamName text NOT NULL UNIQUE)`;

    return  database.run(sqlQuery);
}

const findTeamByName = (name, cb) => {
	return  database.get(`SELECT * FROM teams WHERE teamName = ?`,[name], (err, row) => {
        cb(err, row)
    });
}

const  findUserByEmail  = (email, cb) => {
    return  database.get(`SELECT * FROM users WHERE email = ?`,[email], (err, row) => {
            cb(err, row)
    });
}

const  createUser  = (user, cb) => {
    return  database.run('INSERT INTO users (name, email, password) VALUES (?,?,?)',user, (err) => {
        cb(err);
    });
}

const  createTeam  = (team, cb) => {
    return  database.run('INSERT INTO teams (teamName) VALUES (?)',team, (err) => {
        cb(err);
    });
}

const  joinTeam  = (data, cb) => {
    return  database.run('UPDATE users SET teamName=? WHERE email=?',data, (err) => {
        cb(err);
    });
}

createTeamsTable();
createUsersTable();


router.get('/', (req, res) => {
    res.status(200).send('This is an authentication server');
});

router.post('/register', (req, res) => {

    const  name  =  req.body.name;
    const  email  =  req.body.email;
    console.log(req.body);
    const  password  =  bcrypt.hashSync(req.body.password);

    createUser([name, email, password], (err)=> {
        if(err) {
    		console.log(err);
    		return res.status(500).send("Server error!");
        }
        findUserByEmail(email, (err, user)=> {
            if (err) return  res.status(500).send('Server error!');  
            const  expiresIn  =  24  *  60  *  60;
            const  accessToken  =  jwt.sign({ id:  user.id }, SECRET_KEY, {
                expiresIn:  expiresIn
            });
            res.status(200).send({ "user":  user, "access_token":  accessToken, "expires_in":  expiresIn          
            });
        });
    });
});


router.post('/login', (req, res) => {
    const  email  =  req.body.email;
    const  password  =  req.body.password;
    findUserByEmail(email, (err, user)=>{
        if (err) return  res.status(500).send('Server error!');
        if (!user) return  res.status(404).send('User not found!');
        const  result  =  bcrypt.compareSync(password, user.password);
        if(!result) return  res.status(401).send('Password not valid!');

        const  expiresIn  =  24  *  60  *  60;
        const  accessToken  =  jwt.sign({ id:  user.id }, SECRET_KEY, {
            expiresIn:  expiresIn
        });
        console.log(user);
        res.status(200).send({ "user":  user, "access_token":  accessToken, "expires_in":  expiresIn});
    });
});


router.post('/create-team', (req, res) => {
    const teamName  =  req.body.team.teamName;
    const email = req.body.user.email;
    createTeam([teamName], (err) => {
        if(err) {
            console.log(err);
            return res.status(500).send("Error creating team");
        }
        joinTeam([teamName, email], (err) => {
            if(err) {
                return res.status(500).send("Error joining team");
            }
            else {
                res.status(200).send({ "teamName": teamName });
            }
        });
    });
});


router.post('/join-team', (req, res) => {
    const teamName = req.body.teamName;
    const userEmail = req.body.user.email;
    console.log(teamName);
    joinTeam([teamName, userEmail], (err) => {
        if(err) {
            return res.status(500).send("Error joining team");
        }
        else {
            res.status(200).send({ "teamName": teamName });
        }
    });
});



app.use(router);
const  port  =  process.env.PORT  ||  3000;
const  server  =  app.listen(port, () => {
    console.log('Server listening at http://localhost:'  +  port);
}); 