import './App.sass'
import { auth, login, logout } from './firebase.ts'
import { useAuthState } from 'react-firebase-hooks/auth';


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

function Game () {
    return (
        <div className="game">
            <h1>Game</h1>
        </div>
    );
}

function MainPage () {
    return (
        <>
            <NavBar />
            <div className="main">
                <div className="games">
                    <Game />
                    <Game />
                </div>
            </div>
        </>
    );
}

function App() {
    const user = useAuthState(auth)[0];

    return (
        <div className="app">
            {user ? (
                <MainPage />
            ) : (
                <Login />
            )}
        </div>
    )
}

export default App
