#!/usr/bin/env python3
import json
import tempfile
from pathlib import Path

import author_submission_policy as policy


def test_norm_author_strips_u_prefix():
    assert policy.norm_author("u/JasperHooloop") == "jasperhooloop"
    assert policy.norm_author("  MP3li  ") == "mp3li"


def test_listing_hidden_opt_out(monkeypatch, tmp_path):
    opt = tmp_path / "opt_out.json"
    blk = tmp_path / "block.json"
    opt.write_text(json.dumps({"authors": ["mp3li"]}), encoding="utf-8")
    blk.write_text(json.dumps({"authors": [], "fabformFormIds": []}), encoding="utf-8")
    monkeypatch.setattr(policy, "OPT_OUT_PATH", opt)
    monkeypatch.setattr(policy, "BLOCK_PATH", blk)
    policy.reload_policies()

    hidden, reason = policy.listing_hidden(author="u/mp3li")
    assert hidden is True
    assert reason == "opt_out"

    hidden2, _ = policy.listing_hidden(author="Other Author")
    assert hidden2 is False


def test_listing_hidden_fabform_block(monkeypatch, tmp_path):
    opt = tmp_path / "opt_out.json"
    blk = tmp_path / "block.json"
    opt.write_text(json.dumps({"authors": []}), encoding="utf-8")
    blk.write_text(json.dumps({"fabformFormIds": ["NJGz8VP"]}), encoding="utf-8")
    monkeypatch.setattr(policy, "OPT_OUT_PATH", opt)
    monkeypatch.setattr(policy, "BLOCK_PATH", blk)
    policy.reload_policies()

    hidden, reason = policy.listing_hidden(fabform_form_id="NJGz8VP")
    assert hidden is True
    assert reason == "block"
