import React, { Component } from "react";
import { inject, observer } from "mobx-react";
import { observable, observe, action, autorun, computed } from "mobx";
import BigNumber from "bignumber.js";

@inject("store")
@observer
export default class Account extends Component {
  @observable cryptoHills = [];
  @observable loadingHills = false;
  @observable cryptoHillsBalance = new BigNumber(0);
  @observable approvedHills = [];

  async componentDidMount() {
    this.hillCoreInstance = await this.props.store.HillCore.deployed();
    this.auction = await this.props.store.AuctionBase.deployed();
    window.s = this;
    this.getCryptoHillsBalance();
    const blockWatcher = observe(
      this.props.store,
      "currentBlock",
      change => {
        this.getCryptoHillsBalance();
        this.getApprovedHills();
      },
      true
    );
    const balanceWatcher = observe(
      this,
      "cryptoHillsBalance",
      change => {
        this.getCryptoHills();
      },
      true
    );
  }

  @action
  async getCryptoHills() {
    const { currentAccount, currentBlock } = this.props.store;
    this.loadingHills = true;
    this.cryptoHills = [];
    if (!currentAccount || this.cryptoHillsBalance == 0) return false;
    const promises = [];
    for (let i = 0; i < this.cryptoHillsBalance; i++) {
      promises.push(
        this.hillCoreInstance
          .tokensOfOwnerByIndex(currentAccount, i)
          .then(res => {
            return this.importCryptoHill(res, currentBlock);
          })
      );
    }
    this.cryptoHills = await Promise.all(promises);
  }

  async getCryptoHillsBalance() {
    const { currentAccount, currentBlock } = this.props.store;
    if (!currentAccount) return false;
    this.cryptoHillsBalance = await this.hillCoreInstance.balanceOf(
      currentAccount,
      currentBlock
    );
  }

  async importCryptoHill(id, currentBlock) {
    const [
      elevation,
      latitude,
      longitude
    ] = await this.hillCoreInstance.getHill(id, currentBlock);
    return { elevation, latitude, longitude, id };
  }

  approveTransfer(id, currentAccount) {
    this.hillCoreInstance
      .approve(this.auction.address, id, {
        from: currentAccount
      })
      .then(res => {
        console.log(res);
      });
  }

  createAuction(id, currentAccount) {
    const bidIncrement = this.props.store.web3.toWei(0.1, "ether");
    this.auction
      .createAuction(this.hillCoreInstance.address, id, bidIncrement, 1000, {
        from: currentAccount
      })
      .then(res => {
        console.log(res);
      });
  }

  promiseify(events) {
    return new Promise((resolve, reject) => {
      events.get((err, res) => {
        if (err) return reject(err);
        return resolve(res);
      });
    });
  }

  async getApprovedHills() {
    const events = this.hillCoreInstance.allEvents({
      fromBlock: 0,
      toBlock: this.props.store.currentBlock
    });
    const allEvents = await this.promiseify(events);
    const tokenIds = allEvents
      .filter(
        event =>
          event.event === "Approval" &&
          event.args.owner === this.props.store.currentAccount
      )
      .map(event => event.args.tokenId);

    this.approvedHills.replace(tokenIds.map(id => id.toString()));
  }

  render() {
    const { currentAccount } = this.props.store;
    return (
      <div>
        <h1>Account {currentAccount}</h1>
        <div>
          Crypto Hills Balance: {this.cryptoHillsBalance.toString()} Hills
        </div>
        <ul>
          {this.cryptoHills.map(hill => {
            const isApproved = this.approvedHills.includes(hill.id.toString());
            return (
              <li key={hill.id.toString()}>
                {JSON.stringify(hill)}{" "}
                <button
                  onClick={() => this.approveTransfer(hill.id, currentAccount)}
                  disabled={isApproved}
                >
                  {isApproved ? "Approved" : "Approve Transfer"}
                </button>
                {isApproved && (
                  <button
                    onClick={() => this.createAuction(hill.id, currentAccount)}
                  >
                    Create Auction
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    );
  }
}
