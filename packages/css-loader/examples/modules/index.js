import React from "react";
import ReactDOM from "react-dom";
import * as classes from "./App.module.css";
console.log(classes);
function App() {
    return (
        <div>
            <h1 className={classes.text}>local name (css modules)!</h1>
            <h1 className={"globalName"}>global name! (:global)</h1>
            <h1 className={"imported"}>
                imported global name (import './global.css')
            </h1>
            <h1 className={classes.background}></h1>
        </div>
    );
}

ReactDOM.render(<App />, document.getElementById("root"));
