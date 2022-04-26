import React from 'react';
import './styles/App.scss';

import Sets from './components/Sets';
import Subsets from './components/Subsets';
import Messages from './components/Messages';

class App extends React.Component {
  render() {
    return (
      <div className="App">
        <Sets />
        <Subsets />
        <Messages />
      </div>
    );
  }
}

export default App;
