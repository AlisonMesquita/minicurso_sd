const express = require('express');
const exphbs = require('express-handlebars'); //Template utilizado no projeto
const methodOverride = require('method-override');  //Possibilita o envio de requests DELETE no form
const redis = require('redis');

// Cria o cliente do Redis
let client = redis.createClient();

client.on('connect', function(){
  console.log('Connected to Redis...');
});

// Setando a porta
const port = 3000;

// Iniciando o app
const app = express();

// View Engine
app.engine('handlebars', exphbs({defaultLayout:'main'})); //Layout padrão será o 'main'
app.set('view engine', 'handlebars'); 

app.use(express.json());    //setando json como padrão
app.use(express.urlencoded({ extended: true }));

// methodOverride
app.use(methodOverride('_method')); //Possibilitando o DELETE do form

// Home
app.get('/', function(req, res, next){
  var array = [];
  client.keys("*", function(err, replies) { //Pega todas as keys
    if (err) {
      console.log(err);
    }

    for(let i = 0; i < replies.length; i++){
      client.HVALS(replies[i], function(err, obj) { //Acessa a info armazenada utilizando as keys
        if (err) {
          console.log(err);
        }
        //Monta o objeto com os valores de cada usuário e em seguida passa o obj pro array de retorno
        let person = {
          "id": replies[i],
          "nome": obj[0],
          "sobrenome": obj[1],
          "email": obj[2],
          "telefone": obj[3]
        }

        array.push(person)
      })
    }
  });

  res.render('searchusers', {
    users: array  //Retorna o array com os usuários armazenados no Redis
  });
});

// Renderiza a página de infos detalhadas quando o usuário é encontrado
app.post('/user/search', function(req, res, next){
  let id = req.body.id;

  client.hgetall(id, function(err, obj){  //Utilizando o comando HGETALL
    if(!obj){
      res.render('searchusers', {
        error: 'O usuário procurado não existe.'
      });
    } 
    else {
      obj.id = id;
      // Renderiza a view de detalhes do usuário retornado
      res.render('details', {
        user: obj //user recebe o objeto retornado pelo HGETALL
      });
    }
  });
});

// Renderiza a página de cadastro do usuário
app.get('/user/add', function(req, res, next){
  res.render('adduser');
});

// POST request para cadastro do usuário
app.post('/user/add', function(req, res, next){
  let id = req.body.id;
  let first_name = req.body.first_name;
  let last_name = req.body.last_name;
  let email = req.body.email;
  let phone = req.body.phone;

  client.hmset(id, [  //Utilizando o comando HMSET 
    'first_name', first_name,
    'last_name', last_name,
    'email', email,
    'phone', phone
    ], 
    function(err, reply){
      if(err){
        console.log(err);
      }
      console.log(reply);

      res.redirect('/');
    }
  );
});

// DELETE para remover o usuário em destaque
app.delete('/user/delete/:id', function(req, res, next){
  client.del(req.params.id);  //Utilizando o comando DEL
  res.redirect('/');
});

//FlushAll - Remove toda a informação
app.get('/flushall', function(req, res, next){
  client.FLUSHALL();
  console.log("Flush all!")

  res.render('searchusers');
});

app.listen(port, function(){
  console.log('\nServidor iniciado na porta ', port);
});
