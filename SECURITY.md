# Security reporting

Never submit credentials, private prompts or exploitable details in public pull
requests, commit comments or attachments. Issues are disabled and this repository
does not advertise an enabled private vulnerability reporting channel or a private
email address.

If a sensitive issue needs reporting, use an already established private channel
to the maintainer if you have one. Otherwise submit only a non-sensitive request
for a private contact channel in a pull request; withhold technical details until
the maintainer provides one. There is no guaranteed response time.

If a key has been exposed, revoke or rotate it with its issuer. Removing it from
the current tree does not remove Git history, forks, logs or downloaded copies.
Do not rewrite shared history without coordination.

## Boundaries

The adapter sends the supplied decision state and questions to OpenAI using the
key managed by Magpie. It fixes the upstream origin, rejects redirects, constructs
headers explicitly and suppresses upstream error bodies. It does not manage
credential storage, account spending, host logs or caller fallback policies.
Offline tests use fictional credentials; passing them is not a security guarantee.
