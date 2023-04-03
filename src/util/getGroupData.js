export async function getGroupData(GroupName, Groups) {

    console.log("Group Name : ", GroupName)
    console.log(Groups)
    if (GroupName === 'dispatcher' || GroupName === 'admin') {
        const GroupDataResp = await Groups.findOne({ name: GroupName });
        console.log("Group Data Resp: ", GroupDataResp._id)
        return GroupDataResp._id;
    }
}
