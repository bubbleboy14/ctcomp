from web3.auto import w3
from cantools.util import read
from cantools import config

class Mint(object):
	def __init__(self, abi, owner, address):
		if abi and owner and address and w3.isConnected():
			w3.eth.defaultAccount = owner
			self.contract = w3.eth.contract(read(abi)).at(address)

	def balance(self, account):
		if account and w3.isConnected() and self.contract:
			return self.contract.balanceOf(account)

	def mint(self, account, amount):
		if account and amount and w3.isConnected() and self.contract:
			self.contract.mint(account, amount)
			return True
		return False

cfg = config.ctcomp.contract
minter = Mint(cfg.abi, cfg.owner, cfg.address)
mint = minter.mint
balance = minter.balance