"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var web3_js_1 = require("@solana/web3.js");
var fs_1 = require("fs");
var PROGRAM_ID = new web3_js_1.PublicKey('D67EtouGnA8zrF4U3NLijdAfm8ztfXTnLvLeeXiRMhBe');
var secret = JSON.parse(fs_1.default.readFileSync('resolver-keypair.json', 'utf8'));
var RESOLVER_KEYPAIR = web3_js_1.Keypair.fromSecretKey(new Uint8Array(secret));
