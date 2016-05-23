/**
 * Url alias feature main file
 */

var Alias = require('./lib/Alias.js');

module.exports = function loadPlugin(projectPath, Plugin) {
  var plugin = new Plugin(__dirname);

  plugin.setConfigs({
    // we.js url alias feature
    enableUrlAlias: true,
    router: {
      alias: {
        // dont load alias for this routes
        excludePaths: [ '/public', '/favicon.ico', '/admin' ]
      }
    }
  });

  plugin.setResource({
    'namePrefix': 'admin.',
    'name': 'urlAlias',
    'namespace': '/admin',
    'templateFolderPrefix': 'admin/',
    'findAll': {
      'search': {
        'alias': {
          'parser': 'contains',
          'target': {
            'type': 'field',
            'field': 'alias'
          }
        },
        'target': {
          'parser': 'contains',
          'target': {
            'type': 'field',
            'field': 'target'
          }
        }
      }
    }
  });

  plugin.setModelUrlAliasFeatures = function setModelUrlAliasFeatures(we, done) {
    for ( var modelName in we.db.modelsConfigs) {
      if (we.router.alias.modelHaveUrlAlias(we.db.modelsConfigs[modelName])) {
        // add url alias virtual field
        we.db.modelsConfigs[modelName].definition.urlPath = {
          type: we.db.Sequelize.VIRTUAL,
          formFieldType: null,
          get: function() {
            if (this.cachedUrlPathAlias) return this.cachedUrlPathAlias;
            this.cachedUrlPathAlias = this.getUrlPathAlias()
            return this.cachedUrlPathAlias;
          }
        };
        // field for set alias
        we.db.modelsConfigs[modelName].definition.setAlias = {
          type: we.db.Sequelize.VIRTUAL,
          formFieldType: null
        };

        // add url alias hooks in all models if enable url alias
        we.db.models[modelName].addHook('afterCreate',
          'createUrlAlias'+modelName,
          we.router.alias.afterCreatedRecord.bind({
            we: we
          })
        );
        we.db.models[modelName].addHook('afterUpdate',
          'updateUrlAlias'+modelName,
          we.router.alias.afterUpdatedRecord.bind({
            we: we
          })
        );
        we.db.models[modelName].addHook('afterDestroy',
          'destroyUrlAlias'+modelName,
          we.router.alias.afterDeleteRecord.bind({
            we: we
          })
        );
      }
    }

    done();
  }

  plugin.events.on('we:Router:construct', function (router) {
    router.alias = new Alias(router.we);
  });
  plugin.hooks.on('we:models:before:instance', plugin.setModelUrlAliasFeatures);

  return plugin;
};