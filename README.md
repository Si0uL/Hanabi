# Hanabi

Basic implementation of the Hanabi game (check rules [`here`](http://www.cocktailgames.com/wp-content/uploads/2016/03/Hanabi_regles_BD.pdf) (French)).

## Instalation

Clone the git branch `dev-replayer` or download and unpack it:
`git clone -b dev-replayer https://github.com/Si0uL/Hanabi.git`

Install dependencies using npm: `npm install`

## Use

Create a `/data/password.json` file constaining the passwords associated to players (the Object's keys).

`npm start [game-easy/game/game-hard] port player1 player2 [player3, player4, player5]`

You can choose to play a specific game by adding its hash as follow:

`npm start [game-easy/game/game-hard] port [h] [HASHNUMBER] player1 player2 [player3, player4, player5]`

Every turn, your game history will be saved in a file located in `/games/`

Use `node recorder.js ip port filepath` to launch replayer on a file (any registred player can log in).
