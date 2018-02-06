import React, { Component } from "react";
import { observer, inject } from "mobx-react";

@inject("store")
@observer
export default class WaitForAccount extends Component {
  render() {
    const { currentAccount } = this.props.store;
    if (!currentAccount) return null;
    return this.props.children;
  }
}
