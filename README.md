# Atelier API

Atelier is a REST API for managing tennis players and retrieving player statistics. It is deployed with AWS CDK and uses API Gateway, Node.js Lambda functions, and a private PostgreSQL 15 database in Amazon RDS. Database credentials are stored in AWS Secrets Manager.

## Prerequisites

- Node.js and npm (the Lambda functions use the Node.js 24 runtime).
- An AWS account and AWS CLI credentials configured for that account, for example with `aws configure` or an AWS IAM Identity Center profile.
- AWS CDK bootstrapped in the target account and region.

The account ID and region are currently specified directly in `bin/atelier.ts` (`828748860265` and `eu-north-1`). Change those values before deploying to a different AWS account or region. Use credentials for the account configured there.

## Install and verify

From the project directory:

```sh
npm ci
npm run build
npm test
```

`npm run build` runs the TypeScript compiler. `npm test` runs the Jest suite.

## Deploy

Bootstrap CDK once per AWS account and region:

```sh
npx cdk bootstrap aws://828748860265/eu-north-1
```

Deploy the stack:

```sh
npx cdk deploy --require-approval never
```

The stack is named `dev-Atelier-Stack`. After deployment, CDK prints an `ApiEndpoint` output. Set a shell variable to that output URL, including its `/players` suffix:

```sh
API_URL="https://your-api-id.execute-api.eu-north-1.amazonaws.com/v1/players"
```

Use the actual value printed by CDK in place of the example URL. API Gateway exposes the API at stage `v1`.

### Initialize the database

Deployment creates the RDS instance and deploys a `CreatePlayersTable` Lambda, but does not invoke that Lambda automatically. Invoke it once before using the player endpoints. With AWS CLI v2, retrieve the deployed function name and invoke it as follows:

```sh
MIGRATION_FUNCTION=$(aws cloudformation describe-stack-resources \
	--stack-name dev-Atelier-Stack \
	--query "StackResources[?ResourceType=='AWS::Lambda::Function' && contains(LogicalResourceId, 'CreatePlayersTable')].PhysicalResourceId | [0]" \
	--output text)

aws lambda invoke \
	--function-name "$MIGRATION_FUNCTION" \
	--cli-binary-format raw-in-base64-out \
	--payload '{}' \
	/tmp/atelier-migration-result.json
cat /tmp/atelier-migration-result.json
```

The function creates the `players` table and indexes if they do not already exist. It runs inside the VPC and connects to the private database. A successful response includes `"Database initialized and ready."`.

## API

All endpoints are under `$API_URL`. The API currently has no authentication or authorization configured; do not expose sensitive player data through it without adding appropriate access controls.

### List players

`GET /players` returns players ordered by rank. Optional query parameters:

| Parameter | Description |
| --- | --- |
| `limit` | Maximum number of players to return; defaults to `50`. |
| `cursor` | Rank cursor for the next page, obtained from the preceding response's `nextCursor`. |
| `sex` | Filter by the player's `sex` value. |

```sh
curl "$API_URL?limit=10&sex=F"
```

The response contains `data.count`, `data.players`, and `data.nextCursor`. When another page is available, pass its `nextCursor` as the next request's `cursor`; otherwise it is `null`.

### Create a player

`POST /players` accepts a JSON body. The API generates the player ID and computes `imc`, `win`, and `total`; those computed fields are not included in the public response.

```sh
curl -X POST "$API_URL" \
	-H 'Content-Type: application/json' \
	-d '{
		"firstname": "Alex",
		"lastname": "Morgan",
		"shortname": "A.MOR",
		"sex": "F",
		"country": {
			"picture": "https://example.com/flags/usa.png",
			"code": "USA"
		},
		"picture": "https://example.com/players/alex-morgan.png",
		"data": {
			"rank": 1,
			"points": 1200,
			"weight": 65000,
			"height": 175,
			"age": 24,
			"last": [1, 0, 1]
		}
	}'
```

Required fields are shown above. `sex` must be one character, `country.code` three characters, numeric stats must meet their non-negative/positive constraints, and `last` must contain only `0` and `1`. For creation, `weight` is interpreted in grams and `height` in centimeters when the API calculates BMI (`imc`).

### Get a player

`GET /players/{playerId}` returns one player. The `playerId` is generated during creation.

```sh
curl "$API_URL/PLAYER_ID"
```

### Update a player

`PUT /players/{playerId}` accepts a partial player object. `firstname` and `lastname` are not updatable. Fields inside `data` are merged with the existing stats.

```sh
curl -X PUT "$API_URL/PLAYER_ID" \
	-H 'Content-Type: application/json' \
	-d '{"data":{"points":1350,"rank":2}}'
```

### Delete a player

`DELETE /players/{playerId}` deletes the player and returns the deleted ID.

```sh
curl -X DELETE "$API_URL/PLAYER_ID"
```

### Get statistics

`GET /players/statistics` returns the country with the highest aggregate win ratio, the average player BMI, and the median player height.

```sh
curl "$API_URL/statistics"
```

### Responses and errors

Successful requests return HTTP `200` with a JSON response body. Invalid JSON or validation failures return `400`; missing players return `404`; unexpected server/database errors return `500`. Error bodies have a `message` field.

## Development commands

```sh
npm run build     # Type-check the project
npm run watch     # Rebuild on source changes
npm test          # Run Jest tests
npx cdk synth     # Synthesize the CloudFormation template
npx cdk diff      # Compare the stack with the deployed version
npx cdk destroy   # Delete the stack
```

The database has a `DESTROY` removal policy and deletion protection is disabled in the current stack. Destroying the stack deletes the database and its data. Back up anything you need before doing so.

