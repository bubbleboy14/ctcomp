from cantools.util import log, read
from cantools import config
cfg = config.ctcomp
wcfg = cfg.w3
ccfg = cfg.contract
try:
	if wcfg.http or wcfg.ws:
		from web3 import Web3
		if wcfg.http:
			w3 = Web3(Web3.HTTPProvider(wcfg.http))
		else: # ws - should maybe update to something non-legacy...
			w3 = Web3(Web3.LegacyWebSocketProvider(wcfg.ws))
		AUTOTRANS = False
	else:
		from web3.auto import w3
		AUTOTRANS = True
	ACTIVE = True
except:
	log("running py2 -- no w3!")
	ACTIVE = False

class Mint(object):
	def __init__(self, abi, owner, address):
		if abi and owner and address and ACTIVE and w3.is_connected():
			w3.eth.defaultAccount = owner
			self.contract = w3.eth.contract(abi=read(abi, isjson=True)['abi'], address=address)
			self.caller = self.contract.caller
		self.log("initialized with: %s, %s, %s"%(abi, owner, address))

	def log(self, msg):
		log("Mint (%s) :: %s"%(self.active() and "active" or "inactive", msg), important=True)

	def active(self):
		return ACTIVE and w3.is_connected() and self.caller

	def balance(self, account):
		if account and self.active():
			return self.caller.balanceOf(account)
		return 0

	def mint(self, account, amount):
		self.log("minting %s to %s"%(amount, account))
		if account and amount and self.active():
			pretrans = self.contract.functions.mint(account, amount)
			if AUTOTRANS:
				pretrans.transact()
			else:
				tx = {
					'nonce': w3.eth.getTransactionCount(w3.eth.defaultAccount),
					'from': w3.eth.defaultAccount
				}
				tx['gas'] = w3.eth.estimateGas(tx)
				trans = pretrans.buildTransaction(tx)
				signed = w3.eth.account.sign_transaction(trans, wcfg.pk)
				thash = w3.eth.send_raw_transaction(signed.rawTransaction)
				hexed = w3.toHex(thash)
				self.log("mint hash: %s"%(hexed,))
			return True
		return False

minter = Mint(ccfg.abi, ccfg.owner, ccfg.address)
mint = minter.mint
balance = minter.balance