import React from 'react';
import logo from './logo.svg';
import './styles/App.css';

import Titlebar from './components/Titlebar';

class App extends React.Component {
  render() {
    return (
      <div className="App">
        <Titlebar />
      </div>
    );
  }
}

export default App;
