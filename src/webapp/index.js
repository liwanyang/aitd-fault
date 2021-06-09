const h = require("h");
const fetch = require("cross-fetch");
const EthQuery = require("eth-query");

var state = {
  isLoading: true,

  // injected at build time
  // faucetAddress: process.env.FAUCET_ADDRESS,
  faucetAddress: null,
  faucetBalance: null,

  userAddress: "",
  fromBalance: null,
  errorMessage: null,

  transactions: [],
  transactionType: "AITD",
  transactionTypeList: {}
};

window.addEventListener("load", startApp);

async function startApp() {
  await getConfig();
  // attempt to get provider from environment
  let provider;
  if (global.ethereum) {
    provider = global.ethereum;
  } else if (global.web3) {
    provider = global.web3.currentProvider;
  }

  // display warning if incompatible
  // if (!provider) {
  //   // abort
  //   render(
  //     h(
  //       "span",
  //       "No ethereum provider detected. Install a web-enabled wallet (eg MetaMask metamask.io) to continue"
  //     )
  //   );
  //   return;
  // }

  // create query helper
  global.ethQuery = new EthQuery(provider);
  global.provider = provider;

  renderApp();
  // setInterval(updateStateFromNetwork, 4000)
}

// function updateStateFromNetwork() {

  // getNetwork();
  // getAccounts()
  // getBalances();
  // renderApp();
// }

async function getConfig() {
  try {
    const res = await fetch(`${window.location.href}v0/getConfig`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json;charset=utf-8"
      }
    });
    const data = await res.json();
    state.transactionTypeList = data;
  } catch (error) {
    //
  }
}

function getNetwork() {
  global.provider.sendAsync(
    { id: 1, jsonrpc: "2.0", method: "net_version" },
    function (err, res) {
      if (err) return console.error(err);
      if (res.error) return console.res.error(res.error);
      var network = res.result;
      state.network = network;
      renderApp();
    }
  );
}

// function getAccounts () {
//   global.ethQuery.accounts(function (err, accounts) {
//     if (err) return console.error(err)
//     var address = accounts[0]
//     if (state.userAddress === address) return
//     state.userAddress = address
//     state.fromBalance = null
//     getBalances()
//     renderApp()
//   })
// }

/*
 * The big new method added for EIP-1102 privacy mode compatibility.
 * Read more here:
 * https://medium.com/metamask/eip-1102-preparing-your-dapp-5027b2c9ed76
 */
// async function requestAccounts() {
//   const provider = global.provider;
//   if ("enable" in provider) {
//     try {
//       // 授权访问MetaMask中的用户账号信息；
//       const accounts = await provider.enable();
//       // getAccounts()
//       getBalances();
//       return accounts[0];
//     } catch (err) {
//       window.alert(
//         "Your web3 account is currently locked. Please unlock it to continue."
//       );
//     }
//   } else {
//     // Fallback to old way if no privacy mode available
//     if (state.userAddress) {
//       return state.userAddress;
//     } else {
//       window.alert(
//         "Your web3 account is currently locked. Please unlock it to continue."
//       );
//       throw new Error("web3 account locked");
//     }
//   }
// }

async function getFaucetAddress() {
  try {
    const res = await fetch(`${window.location.href}v0/getFaucetAddress`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json;charset=utf-8"
      }
    });
    const data = await res.text();
    state.faucetAddress = data;
    return data;
  } catch (error) {
    // err = error;
  }
}

async function getBalances() {
  await getFaucetAddress();
  if (state.faucetAddress) {
    global.ethQuery.getBalance(state.faucetAddress, function (err, result) {
      if (err) return console.error(err);
      state.faucetBalance = (parseInt(result, 16) / 1e18).toFixed(2);
      renderApp();
    });
  }

  if (state.userAddress) {
    global.ethQuery.getBalance(state.userAddress, function (err, result) {
      if (err) {
        state.fromBalance = 0;
        renderApp();
        return console.error(err);
      }
      state.fromBalance = (parseInt(result, 16) / 1e18).toFixed(2);
      renderApp();
    });
  }
}

function getAttr(item) {
  const obj = {
    value: item,
  }
  if (state.transactionType === item) {
    return Object.assign({},obj,{selected: "selected"});
  }
  return obj;
}

function renderApp() {
  // if (state.isLoading) {
  //   return render(h('span', 'web3 detected - Loading...'))
  // }

  // render wrong network warning
  if (state.network === "1") {
    return render([
      h("section.container", [
        h("div.panel.panel-default", [
          h("div.panel-heading", [h("h3", "network")]),
          h("div.panel-body", [
            "currently on mainnet - please select the correct test network"
          ])
        ])
      ])
    ]);
  }

  // render faucet ui
  render([
    h("nav.navbar.navbar-default.container", [
      h("h1.container-fluid", "Aitd Faucet")
    ]),

    h("section.container", [
      h("div.panel.panel-default", [
        h("div.panel-heading", [h("h3", "faucet")]),
        h("div.panel-body", [
          // h("div", "address: " + state.faucetAddress),
          // h("div", "balance: " + formatBalance(state.faucetBalance)),
          // h("div", "user balance: " + formatBalance(state.fromBalance)),
          h(
            "div",
            "Transaction currency:",
            {
              style: {
                margin: '20px 0'
              }
            },
            h("select", {
              name: state.transactionType,
              style: {
                width: "100%",
                height: "36px"
              },
              change: handleTransaction,
            },
            Object.keys(state.transactionTypeList).map((item) => {
              return h("option", getAttr(item), item);
            })
            )
          ),
          h(
            "div",
            "user address:",
            {},
            h("input", {
              style: {
                width: "100%",
                "line-height": "30px"
              },
              value: state.userAddress,
              placeholder: "Please enter user address",
              blur: handleBlur
            })
          ),
          h("button.btn.btn-success", "request", {
            style: {
              margin: "4px"
            },
            // disabled: state.userAddress ? null : true,
            click: getEther.bind(null, 100)
          })
        ])
      ]),

      // h("div.panel.panel-default", [
      //   h("div.panel-heading", [h("h3", "user")]),
      //   h("div.panel-body", [
      //     h("div", "address: " + state.userAddress),
      //     h("div", "balance: " + formatBalance(state.fromBalance)),
      //     h("div", "donate to faucet:"),
      //     h("button.btn.btn-warning", "1 aitd", {
      //       style: {
      //         margin: "4px"
      //       },
      //       // disabled: state.userAddress ? null : true,
      //       click: getEther.bind(null, 1)
      //     }),
      //     h("button.btn.btn-warning", "10 aitd", {
      //       style: {
      //         margin: "4px"
      //       },
      //       // disabled: state.userAddress ? null : true,
      //       click: getEther.bind(null, 10)
      //     }),
      //     h("button.btn.btn-warning", "100 aitd", {
      //       style: {
      //         margin: "4px"
      //       },
      //       // disabled: state.userAddress ? null : true,
      //       click: getEther.bind(null, 100)
      //     })
      //   ])
      // ]),

      h("div.panel.panel-default", [
        h("div.panel-heading", [h("h3", "transactions")]),
        h(
          "div.panel-body",
          {
            style: {
              "flex-direction": "column",
              display: "flex"
            }
          },
          state.transactions.map((txHash) => {
            return link(`http://192.168.1.10:3000/tx/${txHash}`, txHash);
          })
        )
      ])
    ]),
    h("div.container", 
    state.errorMessage
      ? h("div", { style: { color: "red" } }, state.errorMessage)
      : null)

  ]);
}

function handleTransaction(val) {
  state.transactionType = val.target.value;
}

function handleBlur(val) {
  const data = val.target.value || "";
  state.userAddress = data;
  renderApp();
}

function link(url, content) {
  return h("a", { href: url, target: "_blank" }, content);
}

async function getEther(num) {
  // const account = await requestAccounts();

  // // We already prompted to unlock in requestAccounts()
  if (!state.userAddress) {
    alert("Please enter user address")
    return;
  };

  var uri = `${window.location.href}v0/request`;
  var data = {
    account: state.userAddress,
    transactionType: state.transactionType,
    num 
  };

  let res, body, err;

  try {
    res = await fetch(uri, {
      method: "POST",
      body: JSON.stringify(data),
      headers: {
        "Content-Type": "application/json;charset=utf-8"
      }
    });
    body = await res.text();
  } catch (error) {
    err = error;
  }

  // display error
  if (err) {
    state.errorMessage = err || err.stack;
    renderApp();
    return;
  }

  if (res.status === 420) {
    state.errorMessage = `Being ratelimited... try again later`;
    renderApp();
    return;
  }

  if (!res.ok) {
    state.errorMessage = `Error: ${res.status} ${res.statusText} ${body}`;
    renderApp();
    return;
  }

  // display error-in-body
  try {
    if (body.slice(0, 2) === "0x") {
      state.transactions.push(body);
      state.errorMessage = null;
    } else {
      state.errorMessage = body;
    }
  } catch (err) {
    state.errorMessage = err || err.stack;
  }

  // display tx hash
  console.log("faucet response:", body);
  renderApp();
}

// async function sendTx(value) {
//   const address = await requestAccounts();
//   if (!address) return;

//   global.ethQuery.sendTransaction(
//     {
//       from: address,
//       to: state.faucetAddress,
//       value: "0x" + (value * 1e18).toString(16)
//     },
//     function (err, txHash) {
//       if (err) {
//         state.errorMessage = err && err.stack;
//       } else {
//         console.log("user sent tx:", txHash);
//         state.errorMessage = null;
//         state.transactions.push(txHash);
//       }
//       updateStateFromNetwork();
//     }
//   );
// }

function render(elements) {
  if (!Array.isArray(elements)) elements = [elements];
  elements = elements.filter(Boolean);
  // clear
  document.body.innerHTML = "";
  // insert
  elements.forEach(function (element) {
    document.body.appendChild(element);
  });
}

function formatBalance(balance) {
  return balance ? balance + " aitd" : "...";
}
