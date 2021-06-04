const path = require('path')
const ethUtil = require('ethereumjs-util')

function formartConfig(index = 0) {
    // load all configs
    const configPath = path.resolve(process.env.FAUCET_CONFIG_PATH || '../../config.js')
    console.log(`eth-faucet - using faucet config at "${configPath}"`)
    const allConfigs = require(configPath)
    
    // load config for environment
    const environment = process.env.FAUCET_CONFIG || 'ropsten'
    const config = allConfigs[environment]
    if (!config) throw new Error(`Unable to find config for environment "${environment}"`)
    if (!config[index].privateKey) throw new Error('No "privateKey" specified in config.')
    if (!config[index].rpcOrigin) throw new Error('No "rpcOrigin" specified in config.')
    
    // calculate faucet address
    const faucetKey = ethUtil.toBuffer(config[index].privateKey)
    const faucetAddress = ethUtil.privateToAddress(faucetKey)
    const faucetAddressHex = ethUtil.bufferToHex(faucetAddress)
    config[index].address = faucetAddressHex
    return config[index];
}

module.exports = formartConfig
