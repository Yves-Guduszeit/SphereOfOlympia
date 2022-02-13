import './App.css';
import { ethers } from 'ethers';
import V1Token from './artifacts/contracts/tokens/OlpToken.sol/OlpToken.json';
import TokenDelegator from './artifacts/contracts/migration/TokenDelegator.sol/TokenDelegator.json';
import TokenClaimer from './artifacts/contracts/migration/TokenClaimer.sol/TokenClaimer.json';

const {
  OlpTokenDeployedAddress,
  TokenDelegatorDeployedAddress,
  TokenClaimerDeployedAddress
} = require('./config.json');

function App() {
  async function requestAccount() {
    await window.ethereum.request({ method: 'eth_requestAccounts' });
  }

  async function getSigner() {
    await requestAccount();
    let provider = new ethers.providers.Web3Provider(window.ethereum);
    return provider.getSigner();
  }

  async function getV1TokenContract() {
    let signer = await getSigner();
    return new ethers.Contract(OlpTokenDeployedAddress, V1Token.abi, signer);
  }

  async function getTokenDelegatorContract() {
    let signer = await getSigner();
    return new ethers.Contract(TokenDelegatorDeployedAddress, TokenDelegator.abi, signer);
  }

  async function getTokenClaimerContract() {
    let signer = await getSigner();
    return new ethers.Contract(TokenClaimerDeployedAddress, TokenClaimer.abi, signer);
  }

  async function delegateV1Tokens() {
    if (typeof window.ethereum !== 'undefined') {
      let amount = await getHolderBalance();
      await checkForApprove(amount);
      await delegate(amount);
      console.log(`${amount} delegated successfully to ${TokenDelegatorDeployedAddress}`);
    }
  }

  async function checkForApprove(amount) {
    if (typeof window.ethereum !== 'undefined') {
      let v1TokenContract = await getV1TokenContract();
      let signer = await getSigner();
      let signerAddress = await signer.getAddress();
      console.log(`${signerAddress} checking allowance for ${amount} tokens for ${TokenDelegatorDeployedAddress}`);
      if (await v1TokenContract.allowance(signerAddress, TokenDelegatorDeployedAddress) < amount) {
        console.log(`${signerAddress} approving ${amount} tokens for ${TokenDelegatorDeployedAddress}`);
        let transation = await v1TokenContract.approve(TokenDelegatorDeployedAddress, amount);
        await transation.wait();
      }
    }
  }

  async function delegate(amount) {
    if (typeof window.ethereum !== 'undefined') {
      let tokenDelegatorContract = await getTokenDelegatorContract();
      let signer = await getSigner();
      let signerAddress = await signer.getAddress();
      console.log(`${await signer.getAddress()} delegating ${amount} tokens`);
      let transation = await tokenDelegatorContract.delegateV1Tokens(signerAddress, amount);
      await transation.wait();
    }
  }

  async function getHolderBalance() {
    if (typeof window.ethereum !== 'undefined') {
      let v1TokenContract = await getV1TokenContract();
      let signer = await getSigner();
      let signerAddress = await signer.getAddress();
      return await v1TokenContract.balanceOf(signerAddress);
    }
  }

  async function claimV2Tokens() {
    if (typeof window.ethereum !== 'undefined') {
      let tokenClaimerContract = await getTokenClaimerContract();
      let signer = await getSigner();
      let signerAddress = await signer.getAddress();
      let transation = await tokenClaimerContract.claimV2Tokens(signerAddress);
      await transation.wait();
      console.log(`V2 tokens claimed successfully from ${TokenClaimerDeployedAddress}`);
    }
  }

  return (
    <div className="App">
      <header className="App-header">
          <button onClick={delegateV1Tokens}>TRANSFER YOUR $OLP</button>
          <br />
          <button onClick={claimV2Tokens}>CLAIM YOUR $SOO</button>
      </header>
    </div>
  );
}

export default App;
