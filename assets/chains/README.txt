Chain logos, 128x128 PNG, named after the chain id.

Present: solana, base, robinhood, stable, ethereum

They are drawn inside a circle, so square images with filled corners are fine:
the corners are clipped. Anything with transparent corners needs to be legible
on a near black background on its own. Ethereum is composited onto a white
disc for exactly that reason, because the bare mark is dark grey and would
disappear.

To add a chain, drop <chain_id>.png in here. No code change. Until a file
exists, that chain shows a coloured badge with its short code instead, so the
site never has a broken image on it.
