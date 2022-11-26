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
		else: # ws
			w3 = Web3(Web3.WebsocketProvider(wcfg.ws))
	else:
		from web3.auto import w3
	ACTIVE = True
except:
	log("running py2 -- no w3!")
	ACTIVE = False

class Mint(object):
	def __init__(self, abi, owner, address):
		if abi and owner and address and ACTIVE and w3.isConnected():
			w3.eth.defaultAccount = owner
			self.contract = w3.eth.contract(abi=read(abi, isjson=True)['abi'], address=address)
			self.caller = self.contract.caller
		self.log("initialized with: %s, %s, %s"%(abi, owner, address))

	def log(self, msg):
		log("Mint (%s) :: %s"%(self.active() and "active" or "inactive", msg), important=True)

	def active(self):
		return ACTIVE and w3.isConnected() and self.caller

	def balance(self, account):
		if account and self.active():
			return self.caller.balanceOf(account)
		return 0

	def mint(self, account, amount):
		self.log("minting %s to %s"%(amount, account))
		if account and amount and self.active():
			self.contract.functions.mint(account, amount).transact()
			return True
		return False

minter = Mint(ccfg.abi, ccfg.owner, ccfg.address)
mint = minter.mint
balance = minter.balance