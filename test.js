const request=require('supertest');
const app=require('./index');
const { describe } = require('node:test');

describe('GET /',()=>{
    it('should respond with Hello, World!',async()=>{
        const res=await request(app).get('/');
        expect(res.statusCode).toBe(200);
        expect(res.body.message).toBe('Hello, World!');
    });
});

