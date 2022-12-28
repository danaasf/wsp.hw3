import assert from 'assert';
import { v4 as uuidv4 } from "uuid";
import fetch from "node-fetch"
const ERROR_404 = "ERROR_404 - Not Found.";

const args = process.argv.slice(2);
assert(args.length <= 1, 'usage: node test.js [url]');

const url = (args.length == 0) ? 'http://localhost:3000' : args[0];

function sendRequest(endpoint, method = 'GET', body = '', headers = {}) {
    const address = `${url}${endpoint}`;
    const content = {
        method: method,
        headers: headers
    }
    if (body) {
        content['body'] = body
    }
    return fetch(address, content)

}

async function signUpLoginTest(){
    // Bad signup
    let res = await sendRequest('/api/signup')
    assert.equal(res.status, 404)
    res = await sendRequest('/api/signup', 'POST')
    assert.equal(res.status, 400)
    res = await sendRequest('/api/signup', 'POST', "this is not a json")
    assert.equal(res.status, 400)
    res = await sendRequest('/api/signup', 'POST', "")
    assert.equal(res.status, 400)
    let reqBody = JSON.stringify({ username: '', password: 'hello' })
    res = await sendRequest('/api/signup', 'POST', reqBody)
    assert.equal(res.status, 400)
    reqBody = JSON.stringify({ username: 'shalom'})
    res = await sendRequest('/api/signup', 'POST', reqBody)
    assert.equal(res.status, 400)
    reqBody = JSON.stringify({ password: 'shalom'})
    res = await sendRequest('/api/signup', 'POST', reqBody)
    assert.equal(res.status, 400)

    // Successful signup and login
    let user = uuidv4().substring(0, 8);
    let pass = '1234'
    reqBody = JSON.stringify({ username: user, password: pass })
    res = await sendRequest('/api/signup', 'POST', reqBody)
    assert.equal(res.status, 201)

    res = await sendRequest('/api/login', 'POST', reqBody)
    assert.equal(res.status, 201)
    let jwt = (await res.json()).token
    assert(jwt)

    // Same user sign up
    res = await sendRequest('/api/signup', 'POST', reqBody)
    assert.equal(res.status, 400)

    // Bad password
    const wrong_pass = "4321";
    reqBody = JSON.stringify({ username: user, password: wrong_pass})
    res = await sendRequest('/api/login', 'POST', reqBody)
    assert.equal(res.status, 401)

    // Not existing user login
    user = uuidv4().substring(0, 8);
    pass = '1234'
    reqBody = JSON.stringify({ username: user, password: pass })
    res = await sendRequest('/api/login', 'POST', reqBody)
    assert.equal(res.status, 401)

    // Bad login
    res = await sendRequest('/api/login', 'POST')
    assert.equal(res.status, 400)
    res = await sendRequest('/api/login', 'POST', "this is not a json")
    assert.equal(res.status, 400)
    res = await sendRequest('/api/login', 'POST', "")
    assert.equal(res.status, 400)
    reqBody = JSON.stringify({ username: '', password: 'hello'})
    res = await sendRequest('/api/login', 'POST', reqBody)
    assert.equal(res.status, 400)
    reqBody = JSON.stringify({ username: 'hello', password: ''})
    res = await sendRequest('/api/login', 'POST', reqBody)
    assert.equal(res.status, 400)
    reqBody = JSON.stringify({password: 'hello'})
    res = await sendRequest('/api/login', 'POST', reqBody)
    assert.equal(res.status, 400)
    reqBody = JSON.stringify({username: 'hello'})
    res = await sendRequest('/api/login', 'POST', reqBody)
    assert.equal(res.status, 400)

    console.log('Signup test - Passed')
}

async function NewProductTest(){
    // Sign up and log in first
    let user = uuidv4().substring(0, 8);
    let pass = '1234'
    let reqBody = JSON.stringify({ username: user, password: pass })
    let res = await sendRequest('/api/signup', 'POST', reqBody)
    assert.equal(res.status, 201)

    res = await sendRequest('/api/login', 'POST', reqBody)
    assert.equal(res.status, 201)
    let jwt = (await res.json()).token
    assert(jwt)

    // Check unauthorized post new product
    const test_product = {
        "name":"small frog",
        "category":"hat",
        "description":"a very cool hat",
        "price":25,
        "stock":11,
        "image":"shopify.com/s/files/1/0190",
    }
    reqBody = JSON.stringify(test_product)
    res = await sendRequest('/api/product', 'POST', reqBody, { authorization: `Bearer ${jwt}`})
    assert.equal(res.status, 403)

    // add permission to user
    const new_permission = {
        "username":user,
        "permission":"M",
    }
    // admin login
    reqBody = JSON.stringify({ username: "admin", password: "admin" })
    res = await sendRequest('/api/login', 'POST', reqBody)
    assert.equal(res.status, 201)
    let admin_jwt = (await res.json()).token
    assert(admin_jwt)
    // admin change permission
    reqBody = JSON.stringify(new_permission)
    res = await sendRequest('/api/permission', 'PUT', reqBody, { authorization: `Bearer ${admin_jwt}`})
    assert.equal(res.status, 200)
    // try to add new product again - happy flow
    // relogin of user with new permissions - TODO check if it is a correct flow?
    reqBody = JSON.stringify({ username: user, password: pass })
    res = await sendRequest('/api/login', 'POST', reqBody)
    assert.equal(res.status, 201)
    jwt = (await res.json()).token
    assert(jwt)

    reqBody = JSON.stringify(test_product)
    res = await sendRequest('/api/product', 'POST', reqBody, { authorization: `Bearer ${jwt}`})
    assert.equal(res.status, 201)
    let id_out = (await res.json()).id
    assert(id_out)

    // check bad product input
    const bad_test_product1 = {
        "name":"small frog",
        "category":"hat",
        "description":"a very cool hat",
        "price":25,
        "stock":11,
    }
    const bad_test_product2 = {
        "name":"small frog",
        "category":"hat",
        "description":"a very cool hat",
        "price":'25',
        "stock":11,
        "image":"shopify.com/s/files/1/0190",
    }
    const bad_test_product3 = {
        "name":"small frog",
        "category":'',
        "description":"a very cool hat",
        "price":'25',
        "stock":11,
        "image":"shopify.com/s/files/1/0190",
    }
    const bad_test_product4 = {}
    let reqBody1 = JSON.stringify(bad_test_product1)
    let reqBody2 = JSON.stringify(bad_test_product2)
    let reqBody3 = JSON.stringify(bad_test_product3)
    let reqBody4 = JSON.stringify(bad_test_product4)
    res = await sendRequest('/api/product', 'POST', reqBody1, { authorization: `Bearer ${jwt}`})
    assert.equal(res.status, 400)
    res = await sendRequest('/api/product', 'POST', reqBody2, { authorization: `Bearer ${jwt}`})
    assert.equal(res.status, 400)
    res = await sendRequest('/api/product', 'POST', reqBody3, { authorization: `Bearer ${jwt}`})
    assert.equal(res.status, 400)
    res = await sendRequest('/api/product', 'POST', reqBody4, { authorization: `Bearer ${jwt}`})
    assert.equal(res.status, 400)

    // TODO try to add a Product with non integer stock and\or price
    // TODO try to add a product without image field (which is optional)! (should fail in current implementation, must fix)

    console.log('New Product test - Passed')
}

async function PermissionTest(){
    // Sign up and log in first with two users
    let user1 = uuidv4().substring(0, 8);
    let pass = '1234'
    let reqBody = JSON.stringify({ username: user1, password: pass })
    let res = await sendRequest('/api/signup', 'POST', reqBody)
    assert.equal(res.status, 201)

    res = await sendRequest('/api/login', 'POST', reqBody)
    assert.equal(res.status, 201)
    let jwt1 = (await res.json()).token
    assert(jwt1)

    let user2 = uuidv4().substring(0, 8);
    reqBody = JSON.stringify({ username: user2, password: pass })
    res = await sendRequest('/api/signup', 'POST', reqBody)
    assert.equal(res.status, 201)

    res = await sendRequest('/api/login', 'POST', reqBody)
    assert.equal(res.status, 201)
    let jwt2 = (await res.json()).token
    assert(jwt2)

    // add permission to user
    const new_permission = {
        "username":user1,
        "permission":"M",
    }
    reqBody = JSON.stringify(new_permission)
    res = await sendRequest('/api/permission', 'PUT', reqBody, { authorization: `Bearer ${jwt2}`})
    assert.equal(res.status, 403)

    // admin login
    reqBody = JSON.stringify({ username: "admin", password: "admin" })
    res = await sendRequest('/api/login', 'POST', reqBody)
    assert.equal(res.status, 201)
    let admin_jwt = (await res.json()).token
    assert(admin_jwt)
    // admin change permission
    const new_permission2 = {
        "username":user1,
        "permission":"A",
    }
    reqBody = JSON.stringify(new_permission2)
    res = await sendRequest('/api/permission', 'PUT', reqBody, { authorization: `Bearer ${admin_jwt}`})
    assert.equal(res.status, 400)

    const bad_permission = {
        "permission":"M",
    }
    const bad_permission2 = {
        "username":user1,
        "permission":"",
    }

    reqBody = JSON.stringify(bad_permission)
    res = await sendRequest('/api/permission', 'PUT', reqBody, { authorization: `Bearer ${admin_jwt}`})
    assert.equal(res.status, 400)
    reqBody = JSON.stringify(bad_permission2)
    res = await sendRequest('/api/permission', 'PUT', reqBody, { authorization: `Bearer ${admin_jwt}`})
    assert.equal(res.status, 400)

    const good_permission = {
        "username":user1,
        "permission":"M",
    }
    reqBody = JSON.stringify(good_permission)
    res = await sendRequest('/api/permission', 'PUT', reqBody, { authorization: `Bearer ${admin_jwt}`})
    assert.equal(res.status, 200)

    console.log('Permission test - Passed')
}

async function GetProductTest(){
    // Sign up and log in first
    let user = uuidv4().substring(0, 8);
    let pass = '1234'
    let reqBody = JSON.stringify({ username: user, password: pass })
    let res = await sendRequest('/api/signup', 'POST', reqBody)
    assert.equal(res.status, 201)

    res = await sendRequest('/api/login', 'POST', reqBody)
    assert.equal(res.status, 201)
    let jwt = (await res.json()).token
    assert(jwt)

    // admin login
    reqBody = JSON.stringify({ username: "admin", password: "admin" })
    res = await sendRequest('/api/login', 'POST', reqBody)
    assert.equal(res.status, 201)
    let admin_jwt = (await res.json()).token
    assert(admin_jwt)
    // admin change permission
    const new_permission = {
        "username":user,
        "permission":"M",
    }
    reqBody = JSON.stringify(new_permission)
    res = await sendRequest('/api/permission', 'PUT', reqBody, { authorization: `Bearer ${admin_jwt}`})
    assert.equal(res.status, 200)

    // user has permissions to POST new product
    const test_product = {
        "name":"I am a new test product " + uuidv4().substring(0, 8),
        "category":"hat",
        "description":"a very cool hat",
        "price":25,
        "stock":11,
        "image":"shopify.com/s/files/1/0190",
    }

    // user relogin TODO check if it's ok...(INVALID JWT token after permission change)
    reqBody = JSON.stringify({ username: user, password: pass })
    res = await sendRequest('/api/login', 'POST', reqBody)
    assert.equal(res.status, 201)
    jwt = (await res.json()).token
    assert(jwt)

    reqBody = JSON.stringify(test_product)
    res = await sendRequest('/api/product', 'POST', reqBody, { authorization: `Bearer ${jwt}`})
    assert.equal(res.status, 201)
    let id_out = (await res.json()).id
    assert(id_out)

    res = await sendRequest('/api/product/'+id_out, 'GET', null,{ authorization: `Bearer ${jwt}`})
    assert.equal(res.status, 200)
    let product_out = await res.json()
    assert(Object.keys(product_out).length === 1)

    // Enter 10 hats
    for(let i=0;i<10;i++){
        reqBody = JSON.stringify(test_product)
        res = await sendRequest('/api/product', 'POST', reqBody, { authorization: `Bearer ${jwt}`})
        assert.equal(res.status, 201)
        let id_out = (await res.json()).id
        assert(id_out)
    }

    res = await sendRequest('/api/product/hat', 'GET', null,{ authorization: `Bearer ${jwt}`})
    assert.equal(res.status, 200)
    product_out = await res.json()
    assert(Object.keys(product_out).length >= 10)
    // Faulty and not found requests
    res = await sendRequest('/api/product', 'GET', null,{ authorization: `Bearer ${jwt}`})
    assert.equal(res.status, 404)
    res = await sendRequest('/api/product/test/test', 'GET', null,{ authorization: `Bearer ${jwt}`})
    assert.equal(res.status, 404)
    res = await sendRequest('/api/product/'+id_out+'/test', 'GET', null,{ authorization: `Bearer ${jwt}`})
    assert.equal(res.status, 404)

    console.log('Get Product test - Passed')
}


async function NotFoundTest(){
    // Sign up and log in first
    let user = uuidv4().substring(0, 8);
    let pass = '1234'
    let reqBody = JSON.stringify({ username: user, password: pass })
    let res = await sendRequest('/api/signup', 'POST', reqBody)
    assert.equal(res.status, 201)

    res = await sendRequest('/api/login', 'POST', reqBody)
    assert.equal(res.status, 201)
    let jwt = (await res.json()).token
    assert(jwt)

    // admin login
    reqBody = JSON.stringify({ username: "admin", password: "admin" })
    res = await sendRequest('/api/login', 'POST', reqBody)
    assert.equal(res.status, 201)
    let admin_jwt = (await res.json()).token
    assert(admin_jwt)
    // admin change permission
    const new_permission = {
        "username":user,
        "permission":"M",
    }
    reqBody = JSON.stringify(new_permission)
    res = await sendRequest('/api/permission', 'PUT', reqBody, { authorization: `Bearer ${admin_jwt}`})
    assert.equal(res.status, 200)

    // user has permissions to POST new product
    const test_product = {
        "name":"I am a new test product " + uuidv4().substring(0, 8),
        "category":"hat",
        "description":"a very cool hat",
        "price":25,
        "stock":11,
        "image":"shopify.com/s/files/1/0190",
    }

    // user relogin TODO check if it's ok...(INVALID JWT token after permission change)
    reqBody = JSON.stringify({ username: user, password: pass })
    res = await sendRequest('/api/login', 'POST', reqBody)
    assert.equal(res.status, 201)
    jwt = (await res.json()).token
    assert(jwt)

    reqBody = JSON.stringify(test_product)
    res = await sendRequest('/api/product', 'GET', null, { authorization: `Bearer ${jwt}`})
    assert.equal(res.status, 404)
    res = await sendRequest('/api/productt', 'POST', reqBody, { authorization: `Bearer ${jwt}`})
    assert.equal(res.status, 404)
    res = await sendRequest('', 'POST', '', { authorization: `Bearer ${jwt}`})
    assert.equal(res.status, 404)
    res = await sendRequest('/', 'POST', reqBody, { authorization: `Bearer ${jwt}`})
    assert.equal(res.status, 404)
    res = await sendRequest('', 'POST', reqBody)
    assert.equal(res.status, 404)
    res = await sendRequest('/', 'POST', reqBody)
    assert.equal(res.status, 404)
    res = await sendRequest('/api', 'POST', reqBody)
    assert.equal(res.status, 404)
    res = await sendRequest('/', 'PUT', reqBody)
    assert.equal(res.status, 404)
    res = await sendRequest('/', 'PUT', reqBody, { authorization: `Bearer ${jwt}`})
    assert.equal(res.status, 404)


    console.log('Not Found test - Passed')
}

async function DeleteProductTest(){
    // Sign up and log in first
    let user = uuidv4().substring(0, 8);
    let pass = '1234'
    let reqBody = JSON.stringify({ username: user, password: pass })
    let res = await sendRequest('/api/signup', 'POST', reqBody)
    assert.equal(res.status, 201)

    res = await sendRequest('/api/login', 'POST', reqBody)
    assert.equal(res.status, 201)
    let jwt = (await res.json()).token
    assert(jwt)

    // Check unauthorized post new product
    const test_product = {
        "name":"small hoodie",
        "category":"hoodie",
        "description":"a very cool hat",
        "price":25,
        "stock":11,
        "image":"shopify.com/s/files/1/0190",
    }
    reqBody = JSON.stringify(test_product)
    res = await sendRequest('/api/product', 'POST', reqBody, { authorization: `Bearer ${jwt}`})
    assert.equal(res.status, 403)


    // admin login
    reqBody = JSON.stringify({ username: "admin", password: "admin" })
    res = await sendRequest('/api/login', 'POST', reqBody)
    assert.equal(res.status, 201)
    let admin_jwt = (await res.json()).token
    assert(admin_jwt)
    // POST new product
    reqBody = JSON.stringify(test_product)
    res = await sendRequest('/api/product', 'POST', reqBody, { authorization: `Bearer ${admin_jwt}`})
    assert.equal(res.status, 201)
    let id_out = (await res.json()).id
    assert(id_out)
    // GET the same product
    res = await sendRequest('/api/product/'+id_out, 'GET', null, { authorization: `Bearer ${admin_jwt}`})
    assert.equal(res.status, 200)
    let product_out = await res.json()
    assert(Object.keys(product_out).length === 1)
    // DELETE the same product
    res = await sendRequest('/api/product/'+id_out, 'DELETE',{ authorization: `Bearer ${jwt}`})
    assert.equal(res.status, 401)
    res = await sendRequest('/api/product/'+id_out, 'DELETE', null,{ authorization: `Bearer ${jwt}`})
    assert.equal(res.status, 403)
    res = await sendRequest('/api/product/'+id_out, 'DELETE', null,{ authorization: `Bearer ${admin_jwt}`})
    assert.equal(res.status, 200)
    res = await sendRequest('/api/product/'+id_out, 'GET', null, { authorization: `Bearer ${admin_jwt}`})
    assert.equal(res.status, 404)
    product_out = await res.json()
    assert(product_out.message === ERROR_404)


    console.log('Delete Product test - Passed')
}

async function UpdateProductTest(){
    // Sign up and log in first
    let user = uuidv4().substring(0, 8);
    let pass = '1234'
    let reqBody = JSON.stringify({ username: user, password: pass })
    let res = await sendRequest('/api/signup', 'POST', reqBody)
    assert.equal(res.status, 201)

    res = await sendRequest('/api/login', 'POST', reqBody)
    assert.equal(res.status, 201)
    let jwt = (await res.json()).token
    assert(jwt)

    // Check unauthorized post new product
    const test_product = {
        "name":"small hoodie",
        "category":"hoodie",
        "description":"a very cool hat",
        "price":25,
        "stock":11,
        "image":"shopify.com/s/files/1/0190",
    }
    reqBody = JSON.stringify(test_product)
    res = await sendRequest('/api/product', 'POST', reqBody, { authorization: `Bearer ${jwt}`})
    assert.equal(res.status, 403)


    // admin login
    reqBody = JSON.stringify({ username: "admin", password: "admin" })
    res = await sendRequest('/api/login', 'POST', reqBody)
    assert.equal(res.status, 201)
    let admin_jwt = (await res.json()).token
    assert(admin_jwt)
    // TODO check empty PUT!
    // TODO fill this test to check api PUL
    // TODO: check if "5" is ok in price and stock
    // TODO: check if "5.5" \ 5.5 is NOT ok in price and stock
    // // POST new product
    // reqBody = JSON.stringify(test_product)
    // res = await sendRequest('/api/product', 'POST', reqBody, { authorization: `Bearer ${admin_jwt}`})
    // assert.equal(res.status, 201)
    // let id_out = (await res.json()).id
    // assert(id_out)
    // // GET the same product
    // res = await sendRequest('/api/product/'+id_out, 'GET', null, { authorization: `Bearer ${admin_jwt}`})
    // assert.equal(res.status, 200)
    // let product_out = await res.json()
    // assert(Object.keys(product_out).length === 1)
    // // DELETE the same product
    // res = await sendRequest('/api/product/'+id_out, 'DELETE',{ authorization: `Bearer ${jwt}`})
    // assert.equal(res.status, 401)
    // res = await sendRequest('/api/product/'+id_out, 'DELETE', null,{ authorization: `Bearer ${jwt}`})
    // assert.equal(res.status, 403)
    // res = await sendRequest('/api/product/'+id_out, 'DELETE', null,{ authorization: `Bearer ${admin_jwt}`})
    // assert.equal(res.status, 200)
    // res = await sendRequest('/api/product/'+id_out, 'GET', null, { authorization: `Bearer ${admin_jwt}`})
    // assert.equal(res.status, 404)
    // product_out = await res.json()
    // assert(product_out.message === ERROR_404)


    console.log('Update Product test - Passed')
}

signUpLoginTest()
PermissionTest()
NewProductTest()
GetProductTest()
NotFoundTest()
DeleteProductTest()
UpdateProductTest()

// TODO: check tests from whatsapp
// TODO: take care of database error with return code 500
// TODO: deploy to Render, and check the tests in the deployed server, people say that it doesn't work as locally
