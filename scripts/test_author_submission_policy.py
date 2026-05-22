#!/usr/bin/env python3
import json

import author_submission_policy as policy


def test_norm_author_strips_u_prefix():
    assert policy.norm_author("u/JasperHooloop") == "jasperhooloop"
    assert policy.norm_author("  MP3li  ") == "mp3li"


def test_listing_hidden_opt_out_object_map(monkeypatch, tmp_path):
    opt = tmp_path / "opt_out.json"
    blk = tmp_path / "block.json"
    opt.write_text(
        json.dumps({"authors": {"mp3li": "Requested opt-out."}}),
        encoding="utf-8",
    )
    blk.write_text(
        json.dumps({"authors": {}, "bannedAuthorAttemptNotifyFabformId": "NJGz8VP"}),
        encoding="utf-8",
    )
    monkeypatch.setattr(policy, "OPT_OUT_PATH", opt)
    monkeypatch.setattr(policy, "BLOCK_PATH", blk)
    policy.reload_policies()

    hidden, kind, detail = policy.listing_hidden(author="u/mp3li")
    assert hidden is True
    assert kind == "opt_out"
    assert detail == "Requested opt-out."

    hidden2, _, _ = policy.listing_hidden(author="Other Author")
    assert hidden2 is False


def test_listing_hidden_block_author_with_reason(monkeypatch, tmp_path):
    opt = tmp_path / "opt_out.json"
    blk = tmp_path / "block.json"
    opt.write_text(json.dumps({"authors": {}}), encoding="utf-8")
    blk.write_text(
        json.dumps(
            {
                "authors": {
                    "Yas": "Continually uploading poor-quality themes similar to Matrix_S."
                },
                "bannedAuthorAttemptNotifyFabformId": "NJGz8VP",
            }
        ),
        encoding="utf-8",
    )
    monkeypatch.setattr(policy, "OPT_OUT_PATH", opt)
    monkeypatch.setattr(policy, "BLOCK_PATH", blk)
    policy.reload_policies()

    hidden, kind, detail = policy.listing_hidden(author="yas")
    assert hidden is True
    assert kind == "block"
    assert "Matrix_S" in detail


def test_fabform_id_is_notify_only_not_a_block_key(monkeypatch, tmp_path):
    opt = tmp_path / "opt_out.json"
    blk = tmp_path / "block.json"
    opt.write_text(json.dumps({"authors": {}}), encoding="utf-8")
    blk.write_text(
        json.dumps({"authors": {}, "bannedAuthorAttemptNotifyFabformId": "NJGz8VP"}),
        encoding="utf-8",
    )
    monkeypatch.setattr(policy, "OPT_OUT_PATH", opt)
    monkeypatch.setattr(policy, "BLOCK_PATH", blk)
    policy.reload_policies()

    hidden, _, _ = policy.listing_hidden(author="random-uploader")
    assert hidden is False
    assert policy.banned_author_attempt_notify_fabform_id() == "NJGz8VP"
