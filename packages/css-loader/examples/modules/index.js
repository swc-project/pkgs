import React from "react";
import ReactDOM from "react-dom";
import * as classes from "./App.module.css";
console.log(classes);
function App() {
    return (
        <div>
            <h1 className={classes.text}>JSX is working!</h1>
            <h1 className={"globalName"}>JSX is working!</h1>
        </div>
    );
}

ReactDOM.render(<App />, document.getElementById("root"));
