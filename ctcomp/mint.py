from web3.auto import w3
from cantools.util import read
from cantools import config
cfg = config.contract

CON = None

def contract():
	global CON
	if CON:
		return CON
	if not (cfg.abi and cfg.owner and cfg.address):
		return None
	w3.eth.defaultAccount = cfg.owner
	CON = w3.eth.contract(read(cfg.abi)).at(cfg.address)
	return CON

def mint(account, amount):
	if not (account and amount and w3.isConnected()):
		return False
	con = contract()
	if not con:
		return False
	con.mint(account, amount)
	return True