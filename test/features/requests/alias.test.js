var assert = require('assert');
var request = require('supertest');
var helpers = require('we-test-tools').helpers;
var stubs = require('we-test-tools').stubs;
var http;
var we;
var agent;

describe('routerAliasFeature', function() {
  before(function (done) {

    http = helpers.getHttp();
    agent = request.agent(http);
    we = helpers.getWe();

    done();
  });

  beforeEach(function(done){
    we.db.models.userPrivacity
    .destroy({
      where: { id: { $ne: 0 } }
    })
    .then(function(){
      return we.db.models.user.destroy({
        where: { id: { $ne: 0 } }
      });
    })
    .then(function(){ done() })
    .catch(done);
  });

  describe('API', function() {
    it('post /user should create a user with alias from header', function (done) {
      const userStub = stubs.userStub();
      request(http)
      .post('/user')
      .send(userStub)
      .set('Accept', 'application/json')
      .expect(201)
      .end(function (err, res) {
        if (err) {
          console.error(res.text);
          throw err;
        }

        assert(res.body.user);
        assert.equal(res.body.user.linkPermanent,'/user/'+res.body.user.id);

        we.db.models['url-alia'].findOne({
          where: {
            target: res.body.user.linkPermanent
          }
        }).then(function(alias){
          assert(alias);

          done();
        }).catch(done);

      });
    });

    it('put /user/:id should create a user and dont change alias on update', function (done) {
      var userStub = stubs.userStub();
      we.db.models.user.create(userStub)
      .then(function (u){

        request(http)
        .put('/user/'+u.id)
        .send({
          username: 'wananingo'
        })
        .set('Accept', 'application/json')
        .expect(200)
        .end(function (err, res) {
          if (err) {
            console.error('>>', res.text);
            throw err;
          }

          assert(res.body.user);
          assert.equal(res.body.user.linkPermanent,'/user/'+res.body.user.id);

          done();
        });
      }).catch(done);
    });

    it('delete /user/:id should delete one user delete user alias alias', function (done) {
      var userStub = stubs.userStub();
      we.db.models.user.create(userStub)
      .then(function (u){
        request(http)
        .delete('/user/' + u.id)
        .set('Accept', 'application/json')
        .expect(204)
        .end(function (err) {
          if (err) throw err;

          we.db.models['url-alia'].findOne({
            where: {
              target: u.linkPermanent
            }
          }).then(function(alias){
            assert(!alias)
            done();
          }).catch(done);

        });
      }).catch(done);
    });
  });


  after(function (done){
    we.db.models['url-alia']
    .destroy({ truncate: true })
    .then(function(){
      done();
    }).catch(done);
  });
});