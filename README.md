
## Restaurant Complete project 

1. create token from the server
2. Send token to frontend and set to browser cookie/local store
3. Send token again frontend to server
4. verify token in the server (make a middleware functions (req, res, next) )
 

# Stripe payment method setup 
- Install Stripe and Stripe account
- Create card element
- Create Stripe account and get publishable key 
- Use Publishable key and use stripe to get card information and error

- Create payment intent post api on the server, and return client secret. Install stripe on the server side and get client secret. make sure you used the payment method types: ['card']
- from client side get the client secret and save it
- use confirm card payment and pass user information, card and client secret
- display transaction Id.




