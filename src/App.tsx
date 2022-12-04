import './App.sass'
import { auth, login, logout } from './firebase.ts'
import { useAuthState } from 'react-firebase-hooks/auth';
import { useEffect, useState, useRef } from 'react';
import { useInterval } from 'usehooks-ts'
import moment from 'moment';
import Fab from '@mui/material/Fab';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    background: {
        default: '#2e3440',
        paper: '#2e3440',
    },
    primary: {
        main: '#5e81ac',
    },
    secondary: {
        main: '#b48ead',
    },
}});


function Login () {
    return (
        <div className="login">
            <h1>Game Battle</h1>
            <button onClick={login}>Log in with Google</button>
        </div>
   );
}

function NavBar () {
    const user = useAuthState(auth)[0];

    return (
        <div className="navbar">
            <h1>Game Battle</h1>
            <button onClick={logout}>
                <img src={user?.photoURL} alt="user" />
                Log out
            </button>
        </div>
    );
}

const dropdown_loadGames = async (setGames, setSelectedGame, setLoading, session, game) => {
    const API_URL = process.env.REACT_APP_API_URL;

    const games_raw = await fetch(`${API_URL}/sessions/${session}/games`);
    const games = await games_raw.json();
    const games_data = await Promise.all(games.games.map(async (game) => {
        const game_raw = await fetch(`${API_URL}/sessions/${session}/games/${game}`);
        const game_data = await game_raw.json();
        game_data.id = game;
        return game_data;
    }));
    const selected = games_data.find((game_d) => game_d.id === game);
    setSelectedGame(selected || null);
    setGames(games_data);
    setLoading(false);
};

function GameSelection ({ session, game, setGame }) {
    const [games, setGames] = useState([]);
    const [selectedGame, setSelectedGame] = useState(game);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (session) {
            dropdown_loadGames(setGames, setSelectedGame, setLoading, session, game);
        }
    }, [session, game]);

    useInterval(() => {
        if (session) {
            dropdown_loadGames(setGames, setSelectedGame, setLoading, session, game);
        }
    }, 2000);
        

    const transformGame = (game) => (game && { value: game.id, label: `${game.data && game.data.name} - ${moment.unix(game.start_time).fromNow()}`})
    return loading ? (
        <div className="game-selection">
            <h2>Loading...</h2>
        </div>
    ) : (
        <div className="game-selection">
            <Select
                value={selectedGame && selectedGame.id}
                label="Game"
                onChange={(event) => setGame(games.find((game) => game.id === event.target.value))}
            >
                {games.map((game) => (
                    <MenuItem value={game.id}>{transformGame(game).label}</MenuItem>
                ))}
            </Select>
        </div>
    );
}

const newgame_loadGames = async (setGames, session) => {
    const API_URL = process.env.REACT_APP_API_URL;

    const games_raw = await fetch(`${API_URL}/sessions/${session}/games`);
    const games = await games_raw.json();
    setGames(games.games);
};

function NewGameButton ({ session, setGame }) {
    const [games, setGames] = useState([]);

    useEffect(() => {
        if (session) {
            newgame_loadGames(setGames, session);
        }
    }, [session]);

    useInterval(() => {
        if (session) {
            newgame_loadGames(setGames, session);
        }
    }, 2000);

    const createGame = async () => {
        const API_URL = process.env.REACT_APP_API_URL;

        const game_raw = await fetch(`${API_URL}/sessions/${session}/games`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        const game = await game_raw.json();
        setGame(game);
    };

    return games.length >= 5 ? (
       <Fab aria-label="add" disabed>
           <AddIcon />
       </Fab>
    ) : (
       <Fab aria-label="add" onClick={createGame} color="primary">
           <AddIcon />
       </Fab>
    );
}

const startGame = async (setGame) => {
    const API_URL = process.env.REACT_APP_API_URL;

    const game = await fetch(`${API_URL}/sessions/${session}/games`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
    }).then((res) => res.json());
    setGame(game);
};

function Game ({ session }) {
    const [game, setGame] = useState(null);
    const [output, setOutput] = useState("");
    const [input, setInput] = useState("");
    const [done, setDone] = useState(false);
    const ref = useRef(null);
    const API_URL = process.env.REACT_APP_API_URL;

    useEffect(() => {
        if (session) {
            startGame(setGame);
        }
    }, [session]);

    useInterval(async () => {
        const game_data = await fetch(`${API_URL}/sessions/${session}/games/${game["id"]}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        }).then((res) => res.json());
        setOutput(game_data.output ? game_data.output.whole : "");
        setDone(game_data.output && game_data.output.done);
    }, session && game && 300);

    const sendText = async (text) => {
        await fetch(`${API_URL}/sessions/${session}/games/${game["id"]}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text }),
        });
    };

    const killGame = async () => {
        await fetch(`${API_URL}/sessions/${session}/games/${game["id"]}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        setGame(null);
        setOutput("");
    };

    const restartGame = async () => {
        await fetch(`${API_URL}/sessions/${session}/games/${game["id"]}/restart`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });
    };

    return (
        <div className="game">
            <div className="game-nav">
                <GameSelection session={session} game={game && game.id} setGame={setGame} />
                <Fab aria-label="restart" onClick={restartGame} color="primary">
                    <RefreshIcon />
                </Fab>
                <NewGameButton session={session} setGame={setGame} />
                <Fab color="primary" aria-label="kill" onClick={killGame}>
                    <DeleteIcon />
                </Fab>
            </div>
            <div className="output">
            {output.split("\n").map((line, i) => (
                <div key={i} className="line">
                    {line}
                    {i === output.split("\n").length - 1 && (!done) && (
                        <input
                            value={input}
                            type="text"
                            className="input"
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    sendText(input + "\n");
                                    setInput("");
                                }
                            }}
                            onChange={(e) => {setInput(e.target.value);}}
                            ref={ref}
                            autoFocus={ref.current === document.activeElement}
                        />
                    )}
                </div>
            ))}
            {done && (
                <div className="line">
                    <Fab color="primary" aria-label="restart" onClick={restartGame}>
                        <RefreshIcon />
                    </Fab>
                </div>
            )}
            </div>
        </div>
    );
}

function MainPage () {
    const [user, loading] = useAuthState(auth);
    const [session, setSession] = useState(null);
    const API_URL = process.env.REACT_APP_API_URL;

    useEffect(() => {
        const getGame = async () => {
            const token = await user.getIdToken();
            const session_raw = await fetch(`${API_URL}/sessions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ token }),
            });
            const session = await session_raw.json();
            setSession(session["session"]);
        };
        getGame();
    }, [loading, user, API_URL]);

    return (
        <>
            <NavBar />
            <div className="main">
                <div className="games">
                    <Game session={session} />
                    <Game session={session} />
                </div>
            </div>
        </>
    );
}

function App() {
    const user = useAuthState(auth)[0];

    return (
        <ThemeProvider theme={darkTheme}>
            <CssBaseline />
            <div className="app">
                {user ? (
                    <MainPage />
                ) : (
                    <Login />
                )}
            </div>
        </ThemeProvider>
    )
}

export default App
