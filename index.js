var readline = require('readline');
var jonathanbot = require('./jonathan.js');

function say(question) {
  let reply = jonathanbot.reply(question)
  console.log("> " + reply);
}

jonathanbot.start();

var rl = readline.createInterface(process.stdin, process.stdout);
rl.setPrompt('');
rl.prompt();
console.log("> Please tell me your worries.");
rl.on('line', function(line) {
    if(line!== "bye"){
      say(line);
    } else if (line in ["bye", "goodbye", "done", "exit", "quit"]) 
    rl.close();
    rl.prompt();
}).on('close',function(){
    console.log("> Nice talking with you. Bye.")
    process.exit(0);
});