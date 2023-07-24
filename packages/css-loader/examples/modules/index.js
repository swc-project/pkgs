import React from "react";
import ReactDOM from "react-dom";
import classes from "./App.module.css";
console.log(classes);
function App() {
    return (
        <div>
            <h1 className={classes.text}>JSX is working!</h1>
        </div>
    );
}

ReactDOM.render(<App />, document.getElementById("root"));
