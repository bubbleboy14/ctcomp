from web3.auto import w3

def mint(account, amount):
	if not (account and amount and w3.isConnected()):
		return False
	# TODO: mint amount here, return True on success