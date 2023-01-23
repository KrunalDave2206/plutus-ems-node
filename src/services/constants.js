exports.CURRENT_TIMESTAMP = { toSqlString: function () { return 'CURRENT_TIMESTAMP()'; } };
exports.SQL_TRUE = 1;
exports.SQL_FALSE = 0;
exports.SQL_EMP_STATUS = ['-1', '0', '1'];
exports.PERMISSIONS_old = {
    user: 'user',
    project: 'project',
    client: 'client',
    leave: 'leaves',
    holiday: 'hrdept',
    vacancies: 'hrdept',
    policy: 'hrdept',
    candidate: 'hrdept'
}
exports.PERMISSIONS = {
    users_all: '110011',
    users_team: '110012',
    users_add: '110013',
    projects_all: '120011',
    projects_add: '120013',
    projects_team: '120014',
    clients_all: '130011',
    clients_add: '130013',
    leaves_all: '140011',
    leaves_team: '140012',
    leaves_add: '140013',
    leaves_action: '140014',
    hr_dept: '150011',
    timetrack_view_team: '160014',
    timetrack_view_all: '160011',
    timetrack_delete: '160015'
}