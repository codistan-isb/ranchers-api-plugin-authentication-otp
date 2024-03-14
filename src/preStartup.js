import _ from "lodash";
export default function afterCreateUserAccount(context) {
    const { appEvents, collections } = context;

    appEvents.on("afterCreateUserAccount", async ({ createdBy, account }) => {
        const { Accounts, Shops } = collections;
        const { _id, emails, userId } = account;
        let accountId = _id
        // console.log("afterCreateUserAccount createdBy ", createdBy);
        // console.log("afterCreateUserAccount  accountId", account._id);
        // console.log("afterCreateUserAccount  accountId", emails[0].address);
        const accountData = await Accounts.findOne({ _id: accountId });
        // console.log("account details", accountData);
        if (!accountData) throw new Error(`Account with ID ${accountId} not found`);
        const shop = await Shops.findOne({ shopType: "primary" });
        if (!shop) throw new ReactionError("not-found", "Shop not found");
        const copyrightDate = new Date().getFullYear();
        // console.log("shop", shop);
        const dataForEmail = {
            // Shop Data
            contactEmail: _.get(shop, "emails[0].address"),
            copyrightDate,
            legalName: _.get(shop, "addressBook[0].company"),
            physicalAddress: {
                address: `${_.get(shop, "addressBook[0].address1")} ${_.get(shop, "addressBook[0].address2")}`,
                city: _.get(shop, "addressBook[0].city"),
                region: _.get(shop, "addressBook[0].region"),
                postal: _.get(shop, "addressBook[0].postal")
            },
            shop,
            shopName: shop.name,
        };
        // console.log("dataForEmail", dataForEmail);
        const language = (account.profile && account.profile.language) || shop.language;
        // console.log("language", language);
        await context.mutations.sendEmail(context, {
            data: dataForEmail,
            fromShop: shop,
            templateName: "accounts/sendWelcomeEmail",
            language,
            to: emails[0]?.address
        });
    })
}
