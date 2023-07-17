import React from "react";
import ReactDOM from "react-dom";
import classes from "./App.module.css";

function App() {
    return <h1 className={classes.text}>JSX is working!</h1>;
}

ReactDOM.render(<App />, document.getElementById("root"));
