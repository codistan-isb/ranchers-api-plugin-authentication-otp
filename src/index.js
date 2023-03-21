import pkg from "../package.json";
import tokenMiddleware from "./util/tokenMiddleware.js";
import getAccounts from "./util/accountServer.js";
import Account from "./resolvers/Account.js";
import Mutation from "./resolvers/Mutations.js";
import importAsString from "@reactioncommerce/api-utils/importAsString.js";
const mySchema = importAsString("./schema.graphql");

/**
 * @summary Registers the authentication plugin
 * @param {ReactionAPI} app The ReactionAPI instance
 * @returns {undefined}
 */
const resolvers = {
  // Account,
  Mutation
};

function myStartup(context) {
  const { app, collections, rootUrl } = context;
  const { users } = collections;

  users.createIndex({ phone: 1 }, { unique: true })


}
export default async function register(app) {
  const { accountsGraphQL } = await getAccounts(app);
  await app.registerPlugin({
    label: "Authentication-OTP",
    name: "authentication-otp",
    autoEnable: true,
    version: pkg.version,
    functionsByType: {
      graphQLContext: [({ req }) => accountsGraphQL.context({ req })],
      startup: [myStartup]
    },
    collections: {
      users: {
        name: "users"
      },

    },
    graphQL: {
      schemas: [mySchema],
      typeDefsObj: [accountsGraphQL.typeDefs],
      resolvers: resolvers
    },
    expressMiddleware: [
      {
        route: "graphql",
        stage: "authenticate",
        fn: tokenMiddleware
      }
    ]
  });
}
