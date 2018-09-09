# Hanabi

Basic implementation of the Hanabi game (check rules [`here`](http://www.cocktailgames.com/wp-content/uploads/2016/03/Hanabi_regles_BD.pdf) (French)).

## Installation

Clone the git branch `dev-replayer` or download and unpack it:
```
git clone -b dev-replayer https://github.com/Si0uL/Hanabi.git
```

Install dependencies using npm:
```
npm install
```

Install bower if you don't have it already:
```
npm install -g bower
```

Use it to install the front-end dependencies:
```
cd views
bower install
```

Create an empty `games/` repository that will contain the games replays.

Create a `/data/password.json` file constaining the passwords associated to players (the Object's keys).

## Use


```
npm start [game-easy/game/game-hard] port player1 player2 [player3, player4, player5]
```

You can choose to play a specific game by adding its hash as follow (not compatible without multicolor cards):

```
npm start [game/game-hard] port h HASHNUMBER player1 player2 [player3, player4, player5]
```

Every turn, your game history will be saved in a file located in `/games/`

Use `node recorder.js ip port filepath` to launch replayer on a file (any registred player can log in).
