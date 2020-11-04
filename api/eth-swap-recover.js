const qs = require('qs')
const BN = require('bignumber.js')
const ClientFactory = require('@liquality/client-factory')

BN.config({ DECIMAL_PLACES: 18 })

const expirationRe = /60[0-9a-f]{2}57[0-9a-f]{2}(.*)421160/i
const secretHashRe = /6048f17f(.*)60215114/i
const recipientAddressRe = /57fe5b73(.*)ff5b73/i
const refundAddressRe = /ff5b73(.*)ff$/i

const eth = ClientFactory.create('mainnet', 'eth', { mnemonic: 'xxx' })

const buildHtml = link => `<!DOCTYPE html>
<html lang="auto">
<body>
<p>Link: <a href="${link}" rel="noopener">${link}</a></p>
</body>
</html>`

const getParams = async aFundHash => {
  const [{ value }, { contractAddress }] = await Promise.all([
    eth.chain.getTransactionByHash(aFundHash),
    eth.getMethod('getTransactionReceipt')(aFundHash)
  ])

  const amount = BN(value).div(1e18).toString()
  const code = await eth.getMethod('getCode')(contractAddress, 'latest')

  const expiration = parseInt(code.match(expirationRe)[1], 16)
  const secretHash = code.match(secretHashRe)[1]
  const recipientAddress = code.match(recipientAddressRe)[1]
  const refundAddress = code.match(refundAddressRe)[1]

  return {
    ccy1: 'eth',
    ccy1v: amount,
    ccy1Addr: refundAddress,
    ccy1CounterPartyAddr: recipientAddress,
    ccy2: 'eth',
    ccy2v: amount,
    aFundHash,
    secretHash,
    expiration,
    isPartyB: false
  }
}

const getSwapLink = params => 'https://liquality.io/swap/#' + qs.stringify(params)

module.exports = async (req, res) => {
  const { aFundHash } = req.query

  try {
    const urlParams = await getParams(aFundHash)
    res.send(buildHtml(getSwapLink(urlParams)))
  } catch (e) {
    res.status(400)
    res.send(e.toString())
  }
}
