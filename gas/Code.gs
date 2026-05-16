// ============================================================
// Mochimon - GAS Backend
// スクリプトプロパティに以下を設定してください：
//   SPREADSHEET_ID  : スプレッドシートのID
//   ADMIN_TOKEN     : 管理者用トークン（任意の文字列）
// ============================================================

function getSpreadsheet() {
  var id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  return SpreadsheetApp.openById(id);
}

function getAdminToken() {
  return PropertiesService.getScriptProperties().getProperty('ADMIN_TOKEN');
}

function generateId() {
  return Utilities.getUuid().replace(/-/g, '').substring(0, 16);
}

function getOrCreateSheet(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  return sheet;
}

function ensureHeaders(sheet, headers) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  }
}

function sheetToObjects(sheet) {
  var lr = sheet.getLastRow();
  if (lr <= 1) return [];
  var data = sheet.getRange(1, 1, lr, sheet.getLastColumn()).getValues();
  var headers = data[0];
  var tz = Session.getScriptTimeZone();
  return data.slice(1).map(function(row) {
    var obj = {};
    headers.forEach(function(h, i) {
      var val = row[i];
      // スプレッドシートの日付セルは Date オブジェクトになるので文字列に変換
      if (val instanceof Date) {
        obj[h] = val.getFullYear() > 1899
          ? Utilities.formatDate(val, tz, 'yyyy-MM-dd')
          : '';
      } else {
        obj[h] = val;
      }
    });
    return obj;
  });
}

// ---- Main handler ----

function doPost(e) {
  var output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);
  try {
    var body = JSON.parse(e.postData.contents);
    var action = body.action;
    var result;
    switch (action) {
      case 'auth':                result = handleAuth(body); break;
      case 'admin/verify':        result = handleAdminVerify(body); break;
      case 'admin/orgs':          result = handleAdminGetOrgs(body); break;
      case 'admin/orgs/create':   result = handleAdminCreateOrg(body); break;
      case 'admin/orgs/delete':   result = handleAdminDeleteOrg(body); break;
      case 'getData':             result = handleGetData(body); break;
      case 'members/upsert':      result = handleMemberUpsert(body); break;
      case 'members/delete':      result = handleMemberDelete(body); break;
      case 'members/reorder':     result = handleMemberReorder(body); break;
      case 'categories/upsert':   result = handleCategoryUpsert(body); break;
      case 'categories/delete':   result = handleCategoryDelete(body); break;
      case 'categories/reorder':  result = handleCategoryReorder(body); break;
      case 'items/upsert':        result = handleItemUpsert(body); break;
      case 'items/delete':        result = handleItemDelete(body); break;
      case 'items/reorder':       result = handleItemReorder(body); break;
      case 'items/transfer':      result = handleItemTransfer(body); break;
      default: throw new Error('Unknown action: ' + action);
    }
    output.setContent(JSON.stringify({ ok: true, data: result }));
  } catch(err) {
    output.setContent(JSON.stringify({ ok: false, error: err.message }));
  }
  return output;
}

// ---- Auth ----

function handleAuth(body) {
  var ss = getSpreadsheet();
  var sheet = getOrCreateSheet(ss, 'orgs');
  var orgs = sheetToObjects(sheet);
  var org = orgs.filter(function(o) { return o.password === body.password; })[0];
  if (!org) throw new Error('パスワードが間違っています');
  return { id: org.id, name: org.name };
}

function handleAdminVerify(body) {
  if (body.token !== getAdminToken()) throw new Error('認証失敗');
  return { ok: true };
}

function handleAdminGetOrgs(body) {
  if (body.token !== getAdminToken()) throw new Error('認証失敗');
  var ss = getSpreadsheet();
  var orgs = sheetToObjects(getOrCreateSheet(ss, 'orgs'));
  return orgs.map(function(o) { return { id: o.id, name: o.name, password: o.password }; });
}

function handleAdminCreateOrg(body) {
  if (body.token !== getAdminToken()) throw new Error('認証失敗');
  var ss = getSpreadsheet();
  var sheet = getOrCreateSheet(ss, 'orgs');
  ensureHeaders(sheet, ['id', 'name', 'password']);
  var id = 'org_' + generateId();
  sheet.appendRow([id, body.name, body.password]);

  // デフォルトのカテゴリをいくつか作成
  var catSheet = getOrCreateSheet(ss, 'categories');
  ensureHeaders(catSheet, ['id', 'orgId', 'name', 'order']);

  return { id: id, name: body.name };
}

function handleAdminDeleteOrg(body) {
  if (body.token !== getAdminToken()) throw new Error('認証失敗');
  var ss = getSpreadsheet();
  var sheet = getOrCreateSheet(ss, 'orgs');
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === body.orgId) { sheet.deleteRow(i + 1); return { ok: true }; }
  }
  return { ok: true };
}

// ---- Data ----

function handleGetData(body) {
  var ss = getSpreadsheet();
  var orgId = body.orgId;

  var members = sheetToObjects(getOrCreateSheet(ss, 'members'))
    .filter(function(m) { return m.orgId === orgId; })
    .sort(function(a, b) { return a.order - b.order; });

  var categories = sheetToObjects(getOrCreateSheet(ss, 'categories'))
    .filter(function(c) { return c.orgId === orgId; })
    .sort(function(a, b) { return a.order - b.order; });

  var items = sheetToObjects(getOrCreateSheet(ss, 'items'))
    .filter(function(i) { return i.orgId === orgId; })
    .sort(function(a, b) { return a.order - b.order; });

  var transfers = sheetToObjects(getOrCreateSheet(ss, 'transfers'))
    .filter(function(t) { return t.orgId === orgId; })
    .sort(function(a, b) { return String(b.transferDate).localeCompare(String(a.transferDate)); });

  return { members: members, categories: categories, items: items, transfers: transfers };
}

// ---- Members ----

function handleMemberUpsert(body) {
  var ss = getSpreadsheet();
  var sheet = getOrCreateSheet(ss, 'members');
  ensureHeaders(sheet, ['id', 'orgId', 'name', 'order']);
  var m = body.member;

  if (m.id) {
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === m.id) {
        sheet.getRange(i + 1, 1, 1, 4).setValues([[m.id, body.orgId, m.name, m.order]]);
        return m;
      }
    }
  }

  var id = 'mbr_' + generateId();
  sheet.appendRow([id, body.orgId, m.name, m.order]);
  return { id: id, orgId: body.orgId, name: m.name, order: m.order };
}

function handleMemberDelete(body) {
  var ss = getSpreadsheet();
  var sheet = getOrCreateSheet(ss, 'members');
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === body.memberId) { sheet.deleteRow(i + 1); return { ok: true }; }
  }
  return { ok: true };
}

function handleMemberReorder(body) {
  var ss = getSpreadsheet();
  var sheet = getOrCreateSheet(ss, 'members');
  var data = sheet.getDataRange().getValues();
  body.order.forEach(function(o) {
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === o.id) { sheet.getRange(i + 1, 4).setValue(o.order); break; }
    }
  });
  return { ok: true };
}

// ---- Categories ----

function handleCategoryUpsert(body) {
  var ss = getSpreadsheet();
  var sheet = getOrCreateSheet(ss, 'categories');
  ensureHeaders(sheet, ['id', 'orgId', 'name', 'order']);
  var c = body.category;

  if (c.id) {
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === c.id) {
        sheet.getRange(i + 1, 1, 1, 4).setValues([[c.id, body.orgId, c.name, c.order]]);
        updateItemsCategoryName(ss, c.id, c.name);
        return c;
      }
    }
  }

  var id = 'cat_' + generateId();
  sheet.appendRow([id, body.orgId, c.name, c.order]);
  return { id: id, orgId: body.orgId, name: c.name, order: c.order };
}

function updateItemsCategoryName(ss, categoryId, categoryName) {
  var sheet = getOrCreateSheet(ss, 'items');
  if (sheet.getLastRow() <= 1) return;
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][3] === categoryId) {
      sheet.getRange(i + 1, 5).setValue(categoryName);
    }
  }
}

function handleCategoryDelete(body) {
  var ss = getSpreadsheet();
  var sheet = getOrCreateSheet(ss, 'categories');
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === body.categoryId) { sheet.deleteRow(i + 1); return { ok: true }; }
  }
  return { ok: true };
}

function handleCategoryReorder(body) {
  var ss = getSpreadsheet();
  var sheet = getOrCreateSheet(ss, 'categories');
  var data = sheet.getDataRange().getValues();
  body.order.forEach(function(o) {
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === o.id) { sheet.getRange(i + 1, 4).setValue(o.order); break; }
    }
  });
  return { ok: true };
}

// ---- Items ----

function handleItemUpsert(body) {
  var ss = getSpreadsheet();
  var sheet = getOrCreateSheet(ss, 'items');
  ensureHeaders(sheet, ['id', 'orgId', 'name', 'categoryId', 'categoryName', 'ownerId', 'ownerName', 'order', 'lastTransferDate']);
  var item = body.item;
  var values = [
    item.id || '', body.orgId, item.name,
    item.categoryId || '', item.categoryName || '',
    item.ownerId, item.ownerName,
    item.order, item.lastTransferDate || ''
  ];

  if (item.id) {
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === item.id) {
        sheet.getRange(i + 1, 1, 1, 9).setValues([values]);
        return item;
      }
    }
  }

  var id = 'itm_' + generateId();
  values[0] = id;
  sheet.appendRow(values);
  return {
    id: id, orgId: body.orgId, name: item.name,
    categoryId: item.categoryId || '', categoryName: item.categoryName || '',
    ownerId: item.ownerId, ownerName: item.ownerName,
    order: item.order, lastTransferDate: item.lastTransferDate || null
  };
}

function handleItemDelete(body) {
  var ss = getSpreadsheet();
  var sheet = getOrCreateSheet(ss, 'items');
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === body.itemId) { sheet.deleteRow(i + 1); return { ok: true }; }
  }
  return { ok: true };
}

function handleItemReorder(body) {
  var ss = getSpreadsheet();
  var sheet = getOrCreateSheet(ss, 'items');
  var data = sheet.getDataRange().getValues();
  body.order.forEach(function(o) {
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === o.id) { sheet.getRange(i + 1, 8).setValue(o.order); break; }
    }
  });
  return { ok: true };
}

function handleItemTransfer(body) {
  var ss = getSpreadsheet();
  var itemSheet = getOrCreateSheet(ss, 'items');
  var data = itemSheet.getDataRange().getValues();
  var fromMemberId = null;
  var fromMemberName = null;
  var itemName = '';
  var transferDate = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');

  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === body.itemId) {
      fromMemberId = data[i][5] || null;
      fromMemberName = data[i][6] || null;
      itemName = data[i][2];
      // ownerId(col6), ownerName(col7), lastTransferDate(col9)
      itemSheet.getRange(i + 1, 6, 1, 2).setValues([[body.toMemberId, body.toMemberName]]);
      itemSheet.getRange(i + 1, 9).setValue(transferDate);
      break;
    }
  }

  var transferSheet = getOrCreateSheet(ss, 'transfers');
  ensureHeaders(transferSheet, ['id', 'orgId', 'itemId', 'itemName', 'fromMemberId', 'fromMemberName', 'toMemberId', 'toMemberName', 'transferDate']);
  var transferId = 'tr_' + generateId();
  transferSheet.appendRow([
    transferId, body.orgId, body.itemId, itemName,
    fromMemberId || '', fromMemberName || '',
    body.toMemberId, body.toMemberName, transferDate
  ]);

  return {
    transfer: {
      id: transferId, orgId: body.orgId, itemId: body.itemId, itemName: itemName,
      fromMemberId: fromMemberId, fromMemberName: fromMemberName,
      toMemberId: body.toMemberId, toMemberName: body.toMemberName,
      transferDate: transferDate
    },
    updatedItem: {
      ownerId: body.toMemberId,
      ownerName: body.toMemberName,
      lastTransferDate: transferDate
    }
  };
}
