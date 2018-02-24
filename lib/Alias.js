/**
 * We.js route alias feature
 *
 * alias = temporary url or clean url
 * target = url permanent
 */
function Alias(w) {
  this.we = w;
}

Alias.prototype = {
  /**
   * Load all alias in memory for use with sync methods
   *
   * @param  {Object}   we we.js
   * @param  {Function} cb callback
   * @return {Object} Sequelize query promisse
   */
  loadAndCacheAllALias() {
    return this.we.db.defaultConnection.query('SELECT * FROM urlAlias');
  },

  /**
   * http handler to use in http.createServer
   */
  httpHandler(req, res) {
    const we = req.we;
    const Op = we.Op;

    // save url after alias or express router
    req.urlBeforeAlias = req.url;

    // only works with GET requests
    if (req.method != 'GET') return we.express.bind(this)(req, res);

    // skip alias
    for (let i = we.config.router.alias.excludePaths.length - 1; i >= 0; i--) {
      if (req.url.indexOf(we.config.router.alias.excludePaths[i]) === 0){
        return we.express.bind(this)(req, res);
      }
    }

    const urlParts = decodeURIComponent(req.url).split(/[?#]/),
      path = urlParts[0];

    if (!path) return we.express.bind(this)(req, res);

    // check if current path have alias
    we.db.models['url-alia']
    .findOne({
      where: {
        [Op.or]: [ { alias: path }, { target: path } ]
      }
    })
    .then(we.router.alias.httpHandler_afterLoadAlias.bind({
      path: path,
      req: req,
      res: res,
      urlParts: urlParts
    }))
    .catch(function errorInSlugHandler (err){
      we.log.error(err);
      res.status(500).end();
      return null;
    });
  },
  httpHandler_afterLoadAlias(urlAlias) {
    const self = this,
        path = this.path,
        req = this.req,
        res = this.res,
        we = this.req.we,
        urlParts = this.urlParts;

    let query = '';

    if (urlParts[1]) query =  '?' + urlParts[1];

    if (urlAlias) {
      // is alias and have a target url
      if (urlAlias.alias == path) {
        // save the url alias record
        req.urlAlias = urlAlias;

        req.url = urlAlias.target;

        if (query) req.url += query;

        we.log.verbose('ulrAlias set for: ' + path + ' to: '+ req.url);

        we.express.bind(this)(req, res);
      } else {
      // is target and have an alias
        // set alias attrs for use in html redirect
        req.haveAlias = urlAlias;
        req.aliasQuery = query;
        return we.express.bind(self)(req, res);
      }
    } else {
      we.log.verbose('ulrAlias not found for:', path);
      // slug not found then continue with default express middlewares
      we.express.bind(self)(req, res);
    }
  },

  /**
   * Check if path have a alias
   *
   * !Cache feature is removed from core
   *
   * @param  {String} path
   * @return {String} Alias or null
   */
  forPath() {
    return null;
  },

  /**
   * Return the alias if avaible or path
   *
   * @param  {String} path
   * @return {String} Alias or the path
   */
  resolvePath(path) {
    return path;
  },

  /**
   * Check if a sequelize model class have alias
   *
   * @param  {Object} Model Sequelize model class
   * @return {Boolean}
   */
  modelHaveUrlAlias(Model) {
    return Boolean (
      Model.options &&
      (Model.options.enableAlias !== false) &&
      Model.options.classMethods &&
      Model.options.classMethods.urlAlias
    );
  },

  /**
   * Code to run after create a record with alias
   *
   * @param  {Object}   record Sequelize record
   * @param  {Object}   opts   sequelize options
   * @param  {Function} done   callback
   */
  afterCreatedRecord(record) {
    return new Promise( (resolve)=> {
      if (!this.we) return resolve();
      const we = this.we;

      const aliasObj = record.constructor.urlAlias(record);
      if (!aliasObj) return resolve();

      if (record.setAlias) {
        aliasObj.alias = record.setAlias;
      }

      if (aliasObj.alias[0] !== '/')  aliasObj.alias = '/'+aliasObj.alias;

      we.db.models['url-alia']
      .create(aliasObj)
      .then( (alS)=> {
        we.log.verbose('New url alias:', alS.id);
        resolve();
        return null;
      })
      .catch( (err)=> {
        we.log.error('Error in generate url alias:', err);
        resolve();
      });
    });

  },
// Model hook functions
//

  /**
   * Code to run after update a record with alias
   *
   * DISABLED by default
   *
   * @param  {Object}   record Sequelize record
   * @param  {Object}   opts   sequelize options
   * @param  {Function} done   callback
   */
  afterUpdatedRecord(record) {
    return new Promise( (resolve)=> {
      if (!this.we) return resolve();
      const we = this.we;
      const newAlias = record.setAlias;
      // only update if set setAlias body field
      if (!newAlias) return resolve();

      // add stash if dont starts with slash
      if (newAlias[0] !== '/') record.setAlias = '/'+ newAlias;

      const aliasObj = {
        alias: record.setAlias,
        target: record.getUrlPath()
      };

      // check if exists:
      we.db.models['url-alia']
      .findOne({
        where: {
          alias: record.setAlias
        }
      })
      .then( (a)=> {
        if (a) {
        // exists then update
          a.updateAttributes(aliasObj)
          .then( ()=> {
            resolve();
            return null;
          })
          .catch( (err)=> {
            we.log.error('Error in updateAttributes url alias:', err);
            resolve();
          });
        } else {
        // this model dont have a alias, then create one
          we.db.models['url-alia']
          .create(aliasObj)
          .then( (alS)=> {
            we.log.verbose('New url alias:', alS.id);
            resolve();
            return null;
          })
          .catch( (err)=> {
            we.log.error('Error in generate url alias for:', err);
            resolve();
            return null;
          });
        }
      })
      .catch( (err)=> {
        we.log.error('Error in update url alias:', err);
        resolve();
        return null;
      });
    });
  },

  /**
   * Code to run after delete a record with alias
   *
   * @param  {Object}   record Sequelize record
   * @param  {Object}   opts   sequelize options
   * @param  {Function} done   callback
   */
  afterDeleteRecord(record) {
    return new Promise( (resolve)=> {
      if (!this.we || !record.getUrlPath) return resolve();
      const we = this.we,
        p = record.getUrlPath();

      if (!p) return resolve();

      we.db.models['url-alia']
      .destroy({
        individualHooks: true,
        where: { target: p }
      })
      .then( (count)=> {
        we.log.verbose(count+' url alias deleted for path: '+p);
        resolve();
        return null;
      })
      .catch( (err)=> {
        we.log.error('Error in delete url alias:', err);
        resolve();
        return null;
      });
    });
  }
};

module.exports = Alias;