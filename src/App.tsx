import './App.sass'
import { auth, login, logout } from './firebase.ts'
import { useAuthState } from 'react-firebase-hooks/auth';
import { useEffect } from 'react';


function Login () {
    const [user, loading, error] = useAuthState(auth);

    return (
        <div className="login">
            <h1>Game Battle</h1>
            <button onClick={login}>Log in with Google</button>
        </div>
   );
}

function NavBar () {
    const [user, loading, error] = useAuthState(auth);

    return (
        <div className="navbar">
            <h1>Game Battle</h1>
            <button onClick={logout}>Log out</button>
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
    const [user, loading, error] = useAuthState(auth);

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
    const [user, loading, error] = useAuthState(auth);

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
